import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Transform } from 'class-transformer'
import dayjs from 'dayjs'

const transformDate = ({ value }: { value: unknown }): unknown => {
  if (value instanceof Date) {
    return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
  }

  return ''
}

export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', comment: 'Unique identifier' })
  id!: number

  @Transform(transformDate, { toPlainOnly: true })
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date

  @Transform(transformDate, { toPlainOnly: true })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', nullable: true, comment: '删除时间' })
  deletedAt!: Date | null
}
