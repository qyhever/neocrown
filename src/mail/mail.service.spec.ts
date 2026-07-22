import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from './mail.service'

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}))

describe('MailService', () => {
  let sendMail: jest.Mock

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue(undefined)
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('应该使用邮箱验证码 HTML 模板发送邮件', async () => {
    const configValues = new Map<keyof EnvironmentVariables, unknown>([
      ['POSTAL_SMTP_SERVER', 'smtp.example.com'],
      ['POSTAL_SMTP_PORT', 465],
      ['POSTAL_FROM_EMAIL', 'no-reply@example.com'],
      ['POSTAL_FROM_PASS', 'password'],
      ['POSTAL_FROM_NAME', '明叶同行'],
    ])
    const configService = {
      get: jest.fn((key: keyof EnvironmentVariables) => configValues.get(key)),
    } as unknown as ConfigService<EnvironmentVariables, true>
    const service = new MailService(configService)

    await service.sendVerificationCode('user@example.com', '123456', 10)

    expect(sendMail).toHaveBeenCalledWith({
      from: '"明叶同行" <no-reply@example.com>',
      to: 'user@example.com',
      subject: '注册邮箱验证码',
      text: '您的注册验证码是 123456，10 分钟内有效。请勿将验证码告知他人。',
      html: expect.stringContaining('MINGYE CARPOOL'),
    })
    const [{ html }] = sendMail.mock.lastCall as [{ html: string }]
    expect(html).toContain('明叶同行')
    expect(html).toContain('安全登录与注册验证邮件')
    expect(html).toContain('123456')
    expect(html).toContain('10 分钟内有效')
    expect(html).not.toContain('{{CODE}}')
    expect(html).not.toContain('{{VALID_MINUTES}}')
  })
})
