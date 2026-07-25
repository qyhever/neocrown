import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import type { EntityManager } from 'typeorm'
import { MailService } from '../mail/mail.service'
import { UserService } from '../user/user.service'
import {
  EmailVerificationCode,
  REGISTRATION_PURPOSE,
} from './entities/email-verification-code.entity'
import { VerificationCodeRepository } from './repositories/verification-code.repository'
import { VerificationCodeService } from './verification-code.service'

describe('VerificationCodeService', () => {
  let service: VerificationCodeService
  let repository: {
    getCurrent: jest.Mock
    saveLatest: jest.Mock
    recordFailure: jest.Mock
    consume: jest.Mock
    invalidate: jest.Mock
  }
  let mailService: { sendVerificationCode: jest.Mock }
  let userService: { existsByEmail: jest.Mock }
  const manager = {} as EntityManager

  const createRecord = (overrides: Partial<EmailVerificationCode> = {}) =>
    ({
      id: 1,
      email: 'user@example.com',
      purpose: REGISTRATION_PURPOSE,
      codeHash: '',
      expiresAt: new Date(Date.now() + 60_000),
      sentAt: new Date(Date.now() - 61_000),
      consumedAt: null,
      failedAttempts: 0,
      ...overrides,
    }) as EmailVerificationCode

  beforeEach(async () => {
    repository = {
      getCurrent: jest.fn(),
      saveLatest: jest.fn(),
      recordFailure: jest.fn(),
      consume: jest.fn(),
      invalidate: jest.fn(),
    }
    mailService = { sendVerificationCode: jest.fn() }
    userService = { existsByEmail: jest.fn().mockResolvedValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        VerificationCodeService,
        { provide: VerificationCodeRepository, useValue: repository },
        { provide: MailService, useValue: mailService },
        { provide: UserService, useValue: userService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('x'.repeat(32)) },
        },
      ],
    }).compile()
    service = module.get(VerificationCodeService)
  })

  it('应该生成六位验证码且只存储摘要', async () => {
    repository.getCurrent.mockResolvedValue(null)

    await expect(
      service.sendRegistrationCode(' USER@Example.com '),
    ).resolves.toBeUndefined()

    const [, code] = mailService.sendVerificationCode.mock
      .lastCall as unknown as [string, string, number]
    const [saved] = repository.saveLatest.mock.lastCall as unknown as [
      { email: string; codeHash: string },
    ]
    expect(code).toMatch(/^\d{6}$/)
    expect(saved.email).toBe('user@example.com')
    expect(saved.codeHash).toHaveLength(64)
    expect(saved.codeHash).not.toContain(code)
  })

  it('已注册邮箱不应该发送验证码', async () => {
    userService.existsByEmail.mockResolvedValue(true)

    await expect(
      service.sendRegistrationCode('user@example.com'),
    ).resolves.toEqual({ error: true, message: '邮箱已注册' })
    expect(repository.saveLatest).not.toHaveBeenCalled()
  })

  it('60 秒内不应该重复发送', async () => {
    repository.getCurrent.mockResolvedValue(
      createRecord({ sentAt: new Date(Date.now() - 1_000) }),
    )

    await expect(
      service.sendRegistrationCode('user@example.com'),
    ).resolves.toEqual({
      error: true,
      message: '验证码发送过于频繁，请稍后再试',
    })
  })

  it('新验证码应该覆盖旧记录', async () => {
    repository.getCurrent.mockResolvedValue(createRecord())

    await service.sendRegistrationCode('user@example.com')

    expect(repository.saveLatest).toHaveBeenCalledTimes(1)
    expect(repository.saveLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        purpose: REGISTRATION_PURPOSE,
      }),
    )
  })

  it('邮件发送失败时应该使验证码失效', async () => {
    const loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation()
    repository.getCurrent.mockResolvedValue(null)
    const error = new Error('SMTP down')
    mailService.sendVerificationCode.mockRejectedValue(error)

    await expect(
      service.sendRegistrationCode('user@example.com'),
    ).resolves.toEqual({
      error: true,
      message: '验证码邮件发送失败，请稍后重试',
    })
    expect(repository.invalidate).toHaveBeenCalledWith(
      'user@example.com',
      REGISTRATION_PURPOSE,
    )
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '发送注册验证码邮件失败',
      error.stack,
    )
    loggerErrorSpy.mockRestore()
  })

  it('错误验证码应该累计失败次数', async () => {
    repository.getCurrent.mockResolvedValue(
      createRecord({
        codeHash: service.hashCode('user@example.com', '123456'),
      }),
    )

    await expect(
      service.verifyRegistrationCode('user@example.com', '000000', manager),
    ).resolves.toEqual({ error: true, message: '验证码错误' })
    expect(repository.recordFailure).toHaveBeenCalledWith(
      expect.any(Object),
      manager,
    )
  })

  it.each([
    { consumedAt: new Date() },
    { expiresAt: new Date(Date.now() - 1) },
    { failedAttempts: 5 },
  ])('已消费、过期或失败五次的验证码应该被拒绝', async (overrides) => {
    repository.getCurrent.mockResolvedValue(createRecord(overrides))

    await expect(
      service.verifyRegistrationCode('user@example.com', '123456', manager),
    ).resolves.toEqual({ error: true, message: '验证码无效或已过期' })
  })

  it('正确验证码应该通过并可被消费', async () => {
    const record = createRecord({
      codeHash: service.hashCode('user@example.com', '123456'),
    })
    repository.getCurrent.mockResolvedValue(record)

    await expect(
      service.verifyRegistrationCode('user@example.com', '123456', manager),
    ).resolves.toBe(record)
    await service.consume(record, manager)
    expect(repository.consume).toHaveBeenCalledWith(record, manager)
  })
})
