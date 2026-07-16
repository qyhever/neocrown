import { Column, Entity, Index } from 'typeorm'
import { Exclude } from 'class-transformer'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity({ name: 'user' })
@Index('idx_username', ['username'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  username!: string

  @Column({ type: 'varchar', length: 50 })
  nickname!: string

  @Exclude({ toPlainOnly: true })
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Hashed password',
    select: false,
  })
  password!: string

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '头像URL' })
  avatar!: string | null

  @Column({ type: 'boolean', default: true, comment: '启用/禁用' })
  isEnabled!: boolean

  @Column({ type: 'boolean', default: false, comment: '系统默认' })
  isSystemDefault!: boolean

  @Column({ type: 'varchar', length: 255 })
  email!: string
}
