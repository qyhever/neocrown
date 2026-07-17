import { Column, Entity, Index } from 'typeorm'
import { Exclude } from 'class-transformer'
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger'
import { BaseEntity } from '../../common/entities/base.entity'

@Entity({ name: 'user' })
@Index('uk_user_username', ['username'], { unique: true })
@Index('uk_user_email', ['email'], { unique: true })
export class User extends BaseEntity {
  @ApiProperty({ description: '用户名，系统内唯一', example: 'admin' })
  @Column({ type: 'varchar', length: 50 })
  username!: string

  @ApiProperty({ description: '用户昵称', example: '管理员' })
  @Column({ type: 'varchar', length: 50 })
  nickname!: string

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Hashed password',
    select: false,
  })
  password!: string

  @ApiPropertyOptional({
    description: '头像 URL。未设置时为 null',
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true, comment: '头像URL' })
  avatar!: string | null

  @ApiProperty({ description: '是否启用', example: true })
  @Column({ type: 'boolean', default: true, comment: '启用/禁用' })
  isEnabled!: boolean

  @ApiProperty({ description: '是否系统默认用户', example: false })
  @Column({ type: 'boolean', default: false, comment: '系统默认' })
  isSystemDefault!: boolean

  @ApiProperty({
    description: '邮箱地址，系统内唯一',
    example: 'admin@example.com',
  })
  @Column({ type: 'varchar', length: 255 })
  email!: string
}
