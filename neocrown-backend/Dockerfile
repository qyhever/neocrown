# 使用Node.js官方镜像作为基础镜像
# 阶段1: 构建应用
FROM node:24.12.0-alpine AS builder

WORKDIR /app

# 保证时区一致
ENV TZ=Asia/Shanghai

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# 阶段2: 运行应用
FROM node:24.12.0-alpine AS runner

WORKDIR /app

# 保证运行时区一致
ENV TZ=Asia/Shanghai

# 复制package.json和pnpm-lock.yaml
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 启用package.json中固定版本的pnpm
RUN corepack enable

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# 暴露8300端口
EXPOSE 8300

# 启动应用
CMD ["pnpm", "start:prod"]
