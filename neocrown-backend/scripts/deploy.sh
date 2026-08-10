#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

REMOTE_HOST="${REMOTE_HOST:-kr}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/apps/neocrown-backend}"
IMAGE_NAME="${IMAGE_NAME:-neocrown-backend}"
IMAGE_TAG="${1:-$(node -p "require('${PROJECT_DIR}/package.json').version")}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
BASE_ENV_FILE="${PROJECT_DIR}/.env"
PROD_ENV_FILE="${PROJECT_DIR}/.env.production"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
SSH_ARGS=()
SCP_ARGS=()

if [[ ! "${IMAGE_TAG}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "错误：镜像版本格式无效：${IMAGE_TAG}" >&2
  exit 1
fi

if [[ -n "${DEPLOY_SSH_PORT}" ]]; then
  if [[ ! "${DEPLOY_SSH_PORT}" =~ ^[0-9]{1,5}$ ]] || ((10#${DEPLOY_SSH_PORT} < 1 || 10#${DEPLOY_SSH_PORT} > 65535)); then
    echo "错误：DEPLOY_SSH_PORT 必须是 1-65535 之间的端口号：${DEPLOY_SSH_PORT}" >&2
    exit 1
  fi

  SSH_ARGS=(-p "${DEPLOY_SSH_PORT}")
  SCP_ARGS=(-P "${DEPLOY_SSH_PORT}")
fi

for command_name in docker ssh scp gzip; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "错误：未找到命令 ${command_name}" >&2
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "错误：Docker daemon 未运行，请先启动 Docker Desktop。" >&2
  exit 1
fi

echo "正在检测远程服务器架构：${REMOTE_HOST}"
REMOTE_ARCH="$(ssh "${SSH_ARGS[@]}" "${REMOTE_HOST}" 'uname -m' | tr -d '\r' | tail -n 1)"

case "${REMOTE_ARCH}" in
  x86_64 | amd64)
    DEFAULT_PLATFORM="linux/amd64"
    ;;
  aarch64 | arm64)
    DEFAULT_PLATFORM="linux/arm64"
    ;;
  *)
    echo "错误：不支持的远程服务器架构：${REMOTE_ARCH}" >&2
    exit 1
    ;;
esac

PLATFORM="${PLATFORM:-${DEFAULT_PLATFORM}}"
TEMP_DIR="$(mktemp -d)"
ARCHIVE_NAME="${IMAGE_NAME//\//-}-${IMAGE_TAG}.tar.gz"
ARCHIVE_PATH="${TEMP_DIR}/${ARCHIVE_NAME}"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

echo "正在构建镜像：${FULL_IMAGE} (${PLATFORM})"
docker buildx build \
  --platform "${PLATFORM}" \
  --tag "${FULL_IMAGE}" \
  --load \
  "${PROJECT_DIR}"

echo "正在导出并压缩镜像：${ARCHIVE_NAME}"
docker save "${FULL_IMAGE}" | gzip -c >"${ARCHIVE_PATH}"

echo "正在创建远程目录：${REMOTE_HOST}:${REMOTE_DIR}"
ssh "${SSH_ARGS[@]}" "${REMOTE_HOST}" bash -s -- "${REMOTE_DIR}" <<'REMOTE_PREPARE'
set -Eeuo pipefail
mkdir -p "$1"
REMOTE_PREPARE

echo "正在上传镜像、Compose 文件和基础环境配置"
scp "${SCP_ARGS[@]}" "${ARCHIVE_PATH}" "${COMPOSE_FILE}" "${BASE_ENV_FILE}" "${REMOTE_HOST}:${REMOTE_DIR}/"
scp "${SCP_ARGS[@]}" "${ARCHIVE_PATH}" "${COMPOSE_FILE}" "${PROD_ENV_FILE}" "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "正在远程导入镜像并启动服务"
ssh "${SSH_ARGS[@]}" "${REMOTE_HOST}" bash -s -- \
  "${REMOTE_DIR}" "${IMAGE_NAME}" "${IMAGE_TAG}" "${ARCHIVE_NAME}" <<'REMOTE_DEPLOY'
set -Eeuo pipefail

REMOTE_DIR="$1"
IMAGE_NAME="$2"
IMAGE_TAG="$3"
ARCHIVE_NAME="$4"

cd "${REMOTE_DIR}"

if [[ ! -f .env.production ]]; then
  echo "错误：远程配置文件 ${REMOTE_DIR}/.env.production 不存在。" >&2
  exit 1
fi

for command_name in docker gzip; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "错误：远程服务器未安装 ${command_name}。" >&2
    exit 1
  fi
done

if docker compose version >/dev/null 2>&1; then
  COMPOSE_COMMAND=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_COMMAND=(docker-compose)
else
  echo "错误：远程服务器未安装 Docker Compose。" >&2
  exit 1
fi

COMPOSE_VERSION="$("${COMPOSE_COMMAND[@]}" version --short 2>/dev/null || "${COMPOSE_COMMAND[@]}" version)"
echo "使用 Docker Compose：${COMPOSE_VERSION}"

gzip -dc "${ARCHIVE_NAME}" | docker load

export IMAGE_NAME IMAGE_TAG

# Python Compose 1.29.2 与新版 Docker Engine 生成的镜像元数据不兼容，
# 直接 recreate 旧容器时会因缺少 ContainerConfig 字段而失败。
# 部署本身要求强制重建，因此先移除旧容器不会改变既有部署语义。
if [[ "${COMPOSE_VERSION}" =~ (^|[[:space:]])v?1\. ]]; then
  echo "检测到旧版 Docker Compose，正在移除旧容器以兼容新版 Docker Engine"
  "${COMPOSE_COMMAND[@]}" down --remove-orphans
fi

"${COMPOSE_COMMAND[@]}" up -d --no-build --remove-orphans --force-recreate
"${COMPOSE_COMMAND[@]}" ps

CONTAINER_ID="$("${COMPOSE_COMMAND[@]}" ps -q app)"
if [[ -z "${CONTAINER_ID}" ]]; then
  echo "错误：未找到 app 服务容器。" >&2
  "${COMPOSE_COMMAND[@]}" logs --tail=100 app >&2 || true
  exit 1
fi

echo "正在等待服务健康检查通过"
HEALTH_TIMEOUT=90
HEALTH_DEADLINE=$((SECONDS + HEALTH_TIMEOUT))

while ((SECONDS < HEALTH_DEADLINE)); do
  HEALTH_STATUS="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER_ID}")"

  case "${HEALTH_STATUS}" in
    healthy)
      echo "服务健康检查已通过"
      break
      ;;
    unhealthy)
      echo "错误：服务健康检查失败。" >&2
      "${COMPOSE_COMMAND[@]}" logs --tail=100 app >&2 || true
      exit 1
      ;;
    starting)
      sleep 2
      ;;
    *)
      echo "错误：容器健康状态异常：${HEALTH_STATUS}" >&2
      "${COMPOSE_COMMAND[@]}" logs --tail=100 app >&2 || true
      exit 1
      ;;
  esac
done

if [[ "${HEALTH_STATUS}" != healthy ]]; then
  echo "错误：等待服务健康检查超时（${HEALTH_TIMEOUT} 秒）。" >&2
  "${COMPOSE_COMMAND[@]}" logs --tail=100 app >&2 || true
  exit 1
fi

"${COMPOSE_COMMAND[@]}" exec -T app node -e \
  "fetch('http://127.0.0.1:' + (process.env.PORT || 8300) + '/api/meta').then((response) => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.text(); }).then((body) => console.log('服务检查通过：' + body))"

rm -f "${ARCHIVE_NAME}"
REMOTE_DEPLOY

echo "部署完成：${FULL_IMAGE}"
