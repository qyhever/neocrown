import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

export const REGISTRATION_PURPOSE = 'register'

@Entity({ name: 'email_verification_code' })
@Index('uk_email_verification_code_email_purpose', ['email', 'purpose'], {
  unique: true,
})
export class EmailVerificationCode extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', length: 32 })
  purpose!: string

  @Column({ type: 'char', length: 64 })
  codeHash!: string

  @Column({ type: 'timestamp' })
  expiresAt!: Date

  @Column({ type: 'timestamp' })
  sentAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  consumedAt!: Date | null

  @Column({ type: 'int', default: 0 })
  failedAttempts!: number
}
