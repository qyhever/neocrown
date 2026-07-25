import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import nodemailer, { type Transporter } from 'nodemailer'
import type { EnvironmentVariables } from '../config/environment.validation'
import type { V2exHotTopicDto } from '../crawler/dto/v2ex-hot-top10-result.dto'

const verificationCodeHtmlTemplate = readFileSync(
  join(__dirname, 'templates', 'verification-code.html'),
  'utf8',
)

@Injectable()
export class MailService {
  private readonly transporter: Transporter
  private readonly from: string

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    const port = this.configService.get('POSTAL_SMTP_PORT', { infer: true })
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('POSTAL_SMTP_SERVER', { infer: true }),
      port,
      secure: port === 465,
      auth: {
        user: this.configService.get('POSTAL_FROM_EMAIL', { infer: true }),
        pass: this.configService.get('POSTAL_FROM_PASS', { infer: true }),
      },
    })
    const fromEmail = this.configService.get('POSTAL_FROM_EMAIL', {
      infer: true,
    })
    const fromName = this.configService.get('POSTAL_FROM_NAME', { infer: true })
    this.from = `"${fromName.replaceAll('"', '\\"')}" <${fromEmail}>`
  }

  async sendVerificationCode(
    email: string,
    code: string,
    validMinutes: number,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: '注册邮箱验证码',
      text: `您的注册验证码是 ${code}，${validMinutes} 分钟内有效。请勿将验证码告知他人。`,
      html: this.renderVerificationCodeHtml(code, validMinutes),
    })
  }

  async sendV2exHotTop10(
    to: string,
    hotlist: V2exHotTopicDto[],
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'V2EX 今日热贴 Top 10',
      text: this.renderV2exHotTop10Text(hotlist),
      html: this.renderV2exHotTop10Html(hotlist),
    })
  }

  private renderVerificationCodeHtml(
    code: string,
    validMinutes: number,
  ): string {
    return verificationCodeHtmlTemplate
      .replace('{{CODE}}', code)
      .replace('{{VALID_MINUTES}}', validMinutes.toString())
  }

  private renderV2exHotTop10Text(hotlist: V2exHotTopicDto[]): string {
    return hotlist
      .map(
        (topic) =>
          `${topic.rank}. ${topic.title}\n${topic.url}\n${topic.crawledAt}`,
      )
      .join('\n\n')
  }

  private renderV2exHotTop10Html(hotlist: V2exHotTopicDto[]): string {
    const items = hotlist
      .map(
        (topic) => `<li>
  <strong>${this.escapeHtml(topic.title)}</strong><br>
  <a href="${this.escapeHtml(topic.url)}">${this.escapeHtml(topic.url)}</a><br>
  <span>${this.escapeHtml(topic.crawledAt)}</span>
</li>`,
      )
      .join('')

    return `<!doctype html>
<html lang="zh-CN">
<body>
  <h1>V2EX 今日热贴 Top 10</h1>
  <ol>
    ${items}
  </ol>
</body>
</html>`
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }
}
