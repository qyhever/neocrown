import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { EntityManager } from 'typeorm'
import type { ServiceErrorResult } from '../common/interceptors/response.interceptor'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from '../mail/mail.service'
import { UserService } from '../user/user.service'
import {
  EmailVerificationCode,
  REGISTRATION_PURPOSE,
} from './entities/email-verification-code.entity'
import { VerificationCodeRepository } from './repositories/verification-code.repository'

const CODE_VALID_MINUTES = 10
const RESEND_INTERVAL_MS = 60_000
const MAX_FAILED_ATTEMPTS = 5

@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name)

  constructor(
    private readonly repository: VerificationCodeRepository,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async sendRegistrationCode(
    rawEmail: string,
  ): Promise<void | ServiceErrorResult> {
    const email = this.normalizeEmail(rawEmail)
    const isRegistered = await this.userService.existsByEmail(email)
    if (isRegistered) {
      return {
        error: true,
        message: ResponseMessageEnum.EMAIL_ALREADY_REGISTERED,
      }
    }

    const current = await this.repository.getCurrent(
      email,
      REGISTRATION_PURPOSE,
    )
    const now = new Date()
    if (
      current &&
      !current.consumedAt &&
      now.getTime() - current.sentAt.getTime() < RESEND_INTERVAL_MS
    ) {
      return {
        error: true,
        message: ResponseMessageEnum.VERIFICATION_CODE_SENT_TOO_FREQUENTLY,
      }
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    await this.repository.saveLatest({
      email,
      purpose: REGISTRATION_PURPOSE,
      codeHash: this.hashCode(email, code),
      sentAt: now,
      expiresAt: new Date(now.getTime() + CODE_VALID_MINUTES * 60_000),
    })

    try {
      await this.mailService.sendVerificationCode(
        email,
        code,
        CODE_VALID_MINUTES,
      )
    } catch (error) {
      this.logger.error(
        '发送注册验证码邮件失败',
        error instanceof Error ? error.stack : undefined,
      )
      await this.repository.invalidate(email, REGISTRATION_PURPOSE)
      return {
        error: true,
        message: ResponseMessageEnum.VERIFICATION_CODE_EMAIL_SEND_FAILED,
      }
    }
  }

  async verifyRegistrationCode(
    rawEmail: string,
    code: string,
    manager: EntityManager,
  ): Promise<EmailVerificationCode | ServiceErrorResult> {
    const email = this.normalizeEmail(rawEmail)
    const current = await this.repository.getCurrent(
      email,
      REGISTRATION_PURPOSE,
      manager,
      true,
    )

    if (
      !current ||
      current.consumedAt ||
      current.expiresAt.getTime() <= Date.now() ||
      current.failedAttempts >= MAX_FAILED_ATTEMPTS
    ) {
      return {
        error: true,
        message: ResponseMessageEnum.VERIFICATION_CODE_INVALID_OR_EXPIRED,
      }
    }

    const actualHash = Buffer.from(this.hashCode(email, code), 'hex')
    const expectedHash = Buffer.from(current.codeHash, 'hex')
    if (
      actualHash.length !== expectedHash.length ||
      !timingSafeEqual(actualHash, expectedHash)
    ) {
      await this.repository.recordFailure(current, manager)
      return {
        error: true,
        message: ResponseMessageEnum.VERIFICATION_CODE_INCORRECT,
      }
    }

    return current
  }

  consume(
    verificationCode: EmailVerificationCode,
    manager: EntityManager,
  ): Promise<void> {
    return this.repository.consume(verificationCode, manager)
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  hashCode(email: string, code: string): string {
    const secret = this.configService.get('EMAIL_VERIFICATION_SECRET', {
      infer: true,
    })
    return createHmac('sha256', secret)
      .update(`${this.normalizeEmail(email)}:${REGISTRATION_PURPOSE}:${code}`)
      .digest('hex')
  }
}
