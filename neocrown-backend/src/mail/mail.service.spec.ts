import { Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from './mail.service'

type SendMailOptions = {
  from: string
  to: string
  subject: string
  text: string
  html?: string
}

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}))

describe('MailService', () => {
  let sendMail: jest.Mock<Promise<void>, [SendMailOptions]>
  let service: MailService

  const configValues = new Map<keyof EnvironmentVariables, unknown>([
    ['POSTAL_SMTP_SERVER', 'smtp.example.com'],
    ['POSTAL_SMTP_PORT', 465],
    ['POSTAL_SMTP_TIMEOUT_MS', 10000],
    ['POSTAL_FROM_EMAIL', 'no-reply@example.com'],
    ['POSTAL_FROM_PASS', 'password'],
    ['POSTAL_FROM_NAME', '明叶同行'],
  ])

  beforeEach(() => {
    sendMail = jest
      .fn<Promise<void>, [SendMailOptions]>()
      .mockResolvedValue(undefined)
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never)
    const configService = {
      get: jest.fn((key: keyof EnvironmentVariables) => configValues.get(key)),
    } as unknown as ConfigService<EnvironmentVariables, true>
    service = new MailService(configService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const getLastSendMailOptions = (): SendMailOptions => {
    const lastCall = sendMail.mock.calls.at(-1)

    if (!lastCall) {
      throw new Error('sendMail was not called')
    }

    return lastCall[0]
  }

  it('应该使用邮箱验证码 HTML 模板发送邮件', async () => {
    await service.sendVerificationCode('user@example.com', '123456', 10)

    const { html } = getLastSendMailOptions()
    expect(sendMail).toHaveBeenCalledWith({
      from: '"明叶同行" <no-reply@example.com>',
      to: 'user@example.com',
      subject: '注册邮箱验证码',
      text: '您的注册验证码是 123456，10 分钟内有效。请勿将验证码告知他人。',
      html,
    })
    expect(html).toContain('MINGYE CARPOOL')
    expect(html).toContain('明叶同行')
    expect(html).toContain('安全登录与注册验证邮件')
    expect(html).toContain('123456')
    expect(html).toContain('10 分钟内有效')
    expect(html).not.toContain('{{CODE}}')
    expect(html).not.toContain('{{VALID_MINUTES}}')
  })

  it('应该发送 V2EX 今日热贴 Top 10 邮件', async () => {
    const hotlist = [
      {
        rank: 1,
        id: 123,
        title: 'TypeScript & NestJS <最佳实践>',
        url: 'https://v2ex.example.com/t/123?x=1&y=2',
        sourceUrl: 'https://v2ex.6688988.xyz/',
        crawledAt: '2026-07-25T00:00:00.000Z',
      },
      {
        rank: 2,
        id: 456,
        title: '每日构建',
        url: 'https://v2ex.example.com/t/456',
        sourceUrl: 'https://v2ex.6688988.xyz/',
        crawledAt: '2026-07-25T00:01:00.000Z',
      },
    ]

    await service.sendV2exHotTop10('receiver@example.com', hotlist)

    const { text, html } = getLastSendMailOptions()
    expect(sendMail).toHaveBeenCalledWith({
      from: '"明叶同行" <no-reply@example.com>',
      to: 'receiver@example.com',
      subject: 'V2EX 今日热贴 Top 10',
      text,
      html,
    })
    expect(text).toContain('1. TypeScript & NestJS <最佳实践>')
    expect(html).toContain('V2EX 今日热贴 Top 10')
    expect(text).toContain('https://v2ex.example.com/t/123?x=1&y=2')
    expect(text).toContain('2026-07-25T00:00:00.000Z')
    expect(text).toContain('2. 每日构建')
    expect(html).toContain('TypeScript &amp; NestJS &lt;最佳实践&gt;')
    expect(html).toContain('https://v2ex.example.com/t/123?x=1&amp;y=2')
    expect(html).toContain('2026-07-25T00:01:00.000Z')
  })

  it('应该使用配置中的发件人发送纯文本邮件', async () => {
    await service.sendMail(
      'receiver@example.com',
      '系统通知',
      '这是一封测试邮件。',
    )

    expect(sendMail).toHaveBeenCalledWith({
      from: '"明叶同行" <no-reply@example.com>',
      to: 'receiver@example.com',
      subject: '系统通知',
      text: '这是一封测试邮件。',
    })
  })

  it('应该配置 SMTP 超时时间', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: 'no-reply@example.com',
        pass: 'password',
      },
    })
  })

  it('SMTP 发送失败时应该返回服务不可用错误', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
    sendMail.mockRejectedValueOnce(new Error('Connection timeout'))

    let caughtError: unknown
    try {
      await service.sendMail(
        'receiver@example.com',
        '系统通知',
        '这是一封测试邮件。',
      )
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).toBeInstanceOf(ServiceUnavailableException)
    expect(caughtError).toMatchObject({
      response: { message: ResponseMessageEnum.MAIL_SEND_FAILED },
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'SMTP 邮件发送失败',
        error: 'Connection timeout',
        to: 'receiver@example.com',
        subject: '系统通知',
      }),
      expect.any(String),
    )

    errorSpy.mockRestore()
  })
})
