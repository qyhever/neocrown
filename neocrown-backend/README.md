<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

邮件验证码和登录功能需要配置以下环境变量（示例值不应直接用于生产环境）：

```dotenv
POSTAL_SMTP_SERVER=smtp.example.com
POSTAL_SMTP_PORT=465
POSTAL_SMTP_TIMEOUT_MS=10000
POSTAL_FROM_EMAIL=no-reply@example.com
POSTAL_FROM_PASS=replace-with-smtp-password
POSTAL_FROM_NAME=NeoCrown
EMAIL_VERIFICATION_SECRET=replace-with-an-independent-random-secret-at-least-32-characters
JWT_SECRET=replace-with-a-strong-random-jwt-secret
JWT_ACCESS_EXPIRE=10m
JWT_REFRESH_EXPIRE=7d
JWT_ISSUER=neocrown
WX_WORK_WEBHOOK_SEND_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send
WX_WORK_WEBHOOK_SEND_KEY=replace-with-your-webhook-key
```

`WX_WORK_WEBHOOK_SEND_URL` 仅填写不含 `key` 参数的 HTTPS 地址，机器人密钥通过
`WX_WORK_WEBHOOK_SEND_KEY` 单独配置。登录成功通知不会提醒群成员；通知发送失败或超时也不会影响登录响应。

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## 配置生成

登录后访问前端 `/klash/generate`，每行输入一个 IPv4 或 IPv6。后端接口为
`POST /api/klash/generate`，请求体为 `{ "ips": "192.0.2.1\n2001:db8::1" }`，
需要 Bearer Access Token。空行忽略，重复 IP 保留；无效 IP 返回 HTTP 400 并指出原始行号。

以下两个配置为必填项，支持绝对路径；相对路径以后端运行目录 `process.cwd()` 为基准：

```dotenv
CLA_CONFIG_TEMPLATE_PATH=./private/klash/template.yaml
CLA_CONFIG_RESULT_DIR_PATH=./private/klash/results
```

模板和结果可能包含节点凭据，建议放在静态资源目录 `public` 之外，并设置合适的文件权限。
现有 `.env.example` 中的路径仅为示例；部署时应根据实际文件位置调整。

模板格式与根目录 `generate.js` 一致：顶层 `proxies:` 使用两个空格缩进的
`- name:` 开始节点，每个节点恰有一个四空格缩进的 `server:`；顶层 `proxy-groups:`
包含名为 `节点选择` 或 `🚀 节点选择` 的组，其四空格缩进的 `proxies:` 下使用六空格缩进的块式列表。
不支持内联对象、内联数组等其他 YAML 排版。名称支持普通文本、JSON 双引号及 YAML 单引号。

每次从原始模板重新生成，保留源节点和其他配置、注释及换行风格。按源节点与每行 IP 的组合
新增节点，递增命名并避开已有节点名，再追加到目标组。结果目录自动创建，文件名按
`Asia/Shanghai` 日期为 `YYYYMMDD.yaml`；同日再次生成通过同目录临时文件重命名覆盖，
并发时以最后一次成功替换为准。读取、模板结构或写入失败返回 HTTP 500，已有文件保持完整。

成功响应示例：

```json
{
  "success": true,
  "message": "配置生成成功",
  "data": {
    "filename": "20261027.yaml",
    "ipCount": 2,
    "sourceNodeCount": 3,
    "generatedNodeCount": 6
  }
}
```

只生成服务器文件并返回摘要，不提供下载接口或历史列表。请求示例见 `rest/klash.http`。
