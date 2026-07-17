# 注册邮件验证码与数据库存储方案

## 总结

- 新增 `AuthModule`，提供发送注册验证码和验证码注册接口。
- 首版使用 MySQL 表存储验证码，通过 `VerificationCodeRepository` 抽象存储，后续可替换为 Redis。
- 验证码为 6 位数字，有效期 10 分钟，60 秒内不可重复发送，最多校验失败 5 次，新验证码覆盖旧验证码。
- SMTP 由独立 `MailModule` 封装，业务层不接触邮件密码和客户端实例。
- 暂时保留现有 `POST /user` 无验证码创建行为，但明确其可以绕过邮箱验证，属于已接受的临时兼容风险。

## 接口与职责调整

- 新增 `POST /auth/registration-code`：
  - 请求：`{ "email": "user@example.com" }`。
  - 检查邮箱是否已注册及发送间隔，生成并发送验证码。
  - 成功响应不返回验证码。
- 新增 `POST /auth/register`：
  - 请求字段：`username`、`nickname`、`email`、`password`、`verificationCode`。
  - 校验验证码后创建用户；`isEnabled` 不由客户端传入，使用实体默认值。
- `AuthService` 编排注册，`VerificationCodeService` 管理验证码生命周期，`MailService` 只负责邮件发送，`UserService` 只负责用户数据和密码处理。
- `POST /user` 暂时保持当前 DTO 和无验证码创建行为；在代码和接口示例中标注为待废弃入口。

## 验证码存储与安全

- 新增 `email_verification_code` 表及 TypeORM 实体，核心字段：
  - `email varchar(255)`：统一转小写并去除首尾空格。
  - `purpose varchar(32)`：首版固定为 `register`。
  - `codeHash char(64)`：保存验证码的 HMAC-SHA256 摘要，不保存明文。
  - `expiresAt`、`sentAt`、`consumedAt`。
  - `failedAttempts`：默认 `0`。
  - 通用的 `id`、`createdAt`、`updatedAt` 字段。
  - 对 `(email, purpose)` 建立唯一索引，每个邮箱仅保留当前用途下最新的一条验证码。
- 新增符合仓库命名规范的 MySQL 脚本 `sql/2026-07-17-add-email-verification-code.sql`，并同步初始化 SQL。
- 新增独立的 `EMAIL_VERIFICATION_SECRET`，用于验证码 HMAC；不能复用 SMTP 密码，不能记录验证码、摘要、密码或邮件凭据。
- 发送时使用安全随机数生成 6 位数字；先写入或覆盖验证码记录，再发送邮件。邮件发送失败时立即使本次记录失效。
- 校验时使用恒定时间比较：
  - 已使用、已过期或失败次数达到 5 次时拒绝。
  - 错误验证码使 `failedAttempts + 1`。
  - 注册成功后设置 `consumedAt`，验证码不可重放。
- 用户创建和验证码消费放在同一个数据库事务中；并发注册依靠验证码行锁及用户邮箱、用户名唯一约束保证只有一次成功。
- 仓库接口以 `getCurrent`、`saveLatest`、`recordFailure`、`consume`、`invalidate` 等行为抽象，TypeORM 作为首版实现；未来 Redis 实现保持业务服务接口不变。

## 邮件配置与发送

- 增加并校验：
  - `POSTAL_SMTP_SERVER`
  - `POSTAL_SMTP_PORT`，数字类型，默认 `465`
  - `POSTAL_FROM_EMAIL`
  - `POSTAL_FROM_PASS`
  - `POSTAL_FROM_NAME`
  - `EMAIL_VERIFICATION_SECRET`
- `MailModule` 使用 Nodemailer 创建单例 SMTP transporter；端口 `465` 使用 `secure: true`。
- `MailService.sendVerificationCode()` 接收收件邮箱、验证码和有效分钟数，模板同时生成纯文本和 HTML 内容。
- SMTP 配置仅由邮件模块读取；验证码服务只调用邮件语义接口。

## 失败行为与测试
- 一些异常: 不抛出 HTTP 状态异常，由 Service 层返回 `{ error: true, message: 'some contents' }`，走统一的逻辑错误返回。
  - 已注册邮箱或用户名
  - 60 秒内重复发送。
  - 验证码错误、已使用或已过期；失败达到 5 次后持续拒绝，直到成功发送新验证码。
  - SMTP 发送失败：返回邮件发送错误，并保证该验证码不可用于注册。
- 单元测试覆盖配置校验、验证码生成与摘要、过期、重发限制、失败次数、新码覆盖、消费后拒绝、邮件失败失效及服务间调用。
- 注册测试覆盖正确验证码成功创建、错误或过期验证码拒绝、并发重放仅一次成功、事务失败不消费验证码。
- 端到端测试覆盖两个新认证接口，并验证新注册 DTO 不接受客户端设置 `isEnabled`。
- 更新 `rest/index.http`，增加发送验证码与注册示例，同时标注旧 `POST /user` 为临时兼容接口。

## 已确定的默认与风险

- 当前运行数据库为 MySQL，首版不新增 Redis 服务。
- 不设置每日发送总量限制；首版只实现 60 秒发送间隔和 5 次验证失败限制。
- 邮箱比较统一采用规范化后的值。
- 暂时保留的 `POST /user` 可以绕过邮箱所有权校验，上线前应通过后续版本移除、改为管理员接口或强制验证码。
