import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import { EmailVerificationCode } from '../entities/email-verification-code.entity'
import {
  type SaveVerificationCodeData,
  VerificationCodeRepository,
} from './verification-code.repository'

@Injectable()
export class TypeOrmVerificationCodeRepository implements VerificationCodeRepository {
  constructor(
    @InjectRepository(EmailVerificationCode)
    private readonly repository: Repository<EmailVerificationCode>,
  ) {}

  getCurrent(
    email: string,
    purpose: string,
    manager?: EntityManager,
    lock = false,
  ): Promise<EmailVerificationCode | null> {
    const query = this.getRepository(manager)
      .createQueryBuilder('verificationCode')
      .where('verificationCode.email = :email', { email })
      .andWhere('verificationCode.purpose = :purpose', { purpose })

    if (lock) query.setLock('pessimistic_write')
    return query.getOne()
  }

  async saveLatest(data: SaveVerificationCodeData): Promise<void> {
    await this.repository.upsert(
      { ...data, consumedAt: null, failedAttempts: 0 },
      ['email', 'purpose'],
    )
  }

  async recordFailure(
    verificationCode: EmailVerificationCode,
    manager?: EntityManager,
  ): Promise<void> {
    verificationCode.failedAttempts += 1
    await this.getRepository(manager).save(verificationCode)
  }

  async consume(
    verificationCode: EmailVerificationCode,
    manager: EntityManager,
  ): Promise<void> {
    verificationCode.consumedAt = new Date()
    await manager.getRepository(EmailVerificationCode).save(verificationCode)
  }

  async invalidate(email: string, purpose: string): Promise<void> {
    await this.repository.update({ email, purpose }, { consumedAt: new Date() })
  }

  private getRepository(
    manager?: EntityManager,
  ): Repository<EmailVerificationCode> {
    return manager?.getRepository(EmailVerificationCode) ?? this.repository
  }
}
