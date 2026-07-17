import type { EntityManager } from 'typeorm'
import { EmailVerificationCode } from '../entities/email-verification-code.entity'

export interface SaveVerificationCodeData {
  email: string
  purpose: string
  codeHash: string
  expiresAt: Date
  sentAt: Date
}

export abstract class VerificationCodeRepository {
  abstract getCurrent(
    email: string,
    purpose: string,
    manager?: EntityManager,
    lock?: boolean,
  ): Promise<EmailVerificationCode | null>

  abstract saveLatest(data: SaveVerificationCodeData): Promise<void>

  abstract recordFailure(
    verificationCode: EmailVerificationCode,
    manager?: EntityManager,
  ): Promise<void>

  abstract consume(
    verificationCode: EmailVerificationCode,
    manager: EntityManager,
  ): Promise<void>

  abstract invalidate(email: string, purpose: string): Promise<void>
}
