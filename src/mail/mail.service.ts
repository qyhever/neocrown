import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'
import type { EnvironmentVariables } from '../config/environment.validation'

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
      html: `<p>您的注册验证码是 <strong>${code}</strong>，${validMinutes} 分钟内有效。</p><p>请勿将验证码告知他人。</p>`,
    })
  }
}
