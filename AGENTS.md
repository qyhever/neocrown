# 仓库指南

## 项目结构与模块组织

本项目是基于 NestJS 11 的 TypeScript 后端。应用代码位于 `src/`：`src/user/` 等功能模块集中存放控制器、服务、DTO、实体、仓库及对应的单元测试。通用拦截器、枚举和基础实体放在 `src/common/`；配置、数据库和日志功能分别位于同名模块中。端到端测试位于 `test/`。SQL 脚本放在 `sql/`，部署工具放在 `scripts/`，HTTP 请求示例放在 `rest/`，构建产物输出到 `dist/`。不要编辑或提交生成文件、日志及依赖目录。

## 构建、测试与开发命令

请使用 Node.js `^22.18.0` 或 `>=24.12.0`，以及 pnpm 11.9.0。

- `pnpm install`：安装依赖，并校验包管理器和 Node.js 版本。
- `pnpm dev`：以 `NODE_ENV=development` 启动 API，并监听文件变化。
- `pnpm build`：更新 `public/meta.json`，然后将应用编译到 `dist/`。
- `pnpm lint`：运行 ESLint 并自动应用安全修复。
- `pnpm format`：格式化 `src/` 和 `test/` 中的 TypeScript 文件。
- `pnpm test`、`pnpm test:e2e`、`pnpm test:cov`：分别运行单元测试、端到端测试和覆盖率测试。

## 编码风格与命名约定

以 Prettier 配置为准：使用单引号、尾随逗号、不使用分号，并采用默认的两个空格缩进。ESLint 启用了类型感知的 TypeScript 规则；应尽量解决未处理 Promise 和不安全参数相关警告。遵循 NestJS 命名方式，例如 `user.service.ts`、`create-user.dto.ts`，导出类型使用 PascalCase，如 `UserService`。新增 SQL 文件到 `sql/` 目录时，文件名必须保持 `YYYY-MM-DD-[name].sql` 格式。保存计划文件时，应保存到 `docs/plans/` 目录，文件名必须保持 `YYYY-MM-DD-[name].md` 格式。功能专用代码和测试应就近放置；只有真正可复用的基础设施才放入 `src/common/`。

## 测试指南

单元测试使用 Jest 和 `ts-jest`，匹配 `src/**/*.spec.ts`；端到端测试匹配 `test/*.e2e-spec.ts`，并使用 Supertest。每次行为变更都应新增或更新测试，包括校验逻辑和失败路径。提交较大改动前运行 `pnpm test:cov`。项目未配置固定覆盖率阈值，因此不得降低所修改模块的测试覆盖程度。

## 提交与拉取请求指南

近期历史采用 Conventional Commits，并使用简洁的中文摘要，例如 `feat: 添加用户查询功能`、`refactor: 优化主应用程序引导逻辑`。请选择 `feat`、`fix`、`refactor`、`test`、`docs` 或 `chore` 等明确类型，并让每个提交只关注一个事项。拉取请求应说明变更内容和验证方式，关联相关 Issue，并明确指出数据库结构、环境变量或 API 变化。必要时同步更新 SQL 脚本或 `rest/index.http` 示例；仅在存在用户可见输出时附加截图。

## 安全与配置

切勿提交 `.env` 文件中的密钥。新增环境变量时，应补充文档，在 `src/config/environment.validation.ts` 中进行校验，并另行提供安全的示例值。SQL 和 Docker 变更会影响持久化数据及生产环境启动流程，必须仔细审查。
