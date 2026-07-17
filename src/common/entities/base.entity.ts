import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Transform } from 'class-transformer'
import dayjs from 'dayjs'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const transformDate = ({ value }: { value: unknown }): unknown => {
  if (value instanceof Date) {
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
  }

  return ''
}

export abstract class BaseEntity {
  @ApiProperty({ description: '主键 ID', example: 1 })
  @PrimaryGeneratedColumn({ type: 'int', comment: 'Unique identifier' })
  id!: number

  @ApiProperty({
    description: '创建时间，格式为 YYYY-MM-DD HH:mm:ss',
    example: '2026-07-17 10:30:00',
  })
  @Transform(transformDate, { toPlainOnly: true })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date

  @ApiProperty({
    description: '更新时间，格式为 YYYY-MM-DD HH:mm:ss',
    example: '2026-07-17 10:30:00',
  })
  @Transform(transformDate, { toPlainOnly: true })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date

  @ApiPropertyOptional({
    description: '软删除时间。未删除时为 null',
    example: null,
    nullable: true,
  })
  @DeleteDateColumn({ type: 'timestamp', nullable: true, comment: '删除时间' })
  deletedAt!: Date | null
}
