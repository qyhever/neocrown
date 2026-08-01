import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../../common/entities/base.entity'

export type ProjectType = '1' | '2'

@Entity({ name: 'project' })
@Index('idx_project_type', ['type'])
@Index('idx_project_deleted_at', ['deletedAt'])
@Index('idx_project_effective_time', ['effectiveTimeStart', 'effectiveTimeEnd'])
export class Project extends BaseEntity {
  @ApiPropertyOptional({
    description: '创建人用户 ID。未记录时为 null',
    example: 1,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true, comment: '创建人用户ID' })
  createdBy!: number | null

  @ApiPropertyOptional({
    description: '更新人用户 ID。未记录时为 null',
    example: 1,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true, comment: '更新人用户ID' })
  updatedBy!: number | null

  @ApiPropertyOptional({
    description: '项目描述。未设置时为 null',
    example: '社招项目',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 500, nullable: true, comment: '项目描述' })
  description!: string | null

  @ApiPropertyOptional({
    description: '生效开始时间。未设置时为 null',
    example: '2026-08-01 00:00:00',
    nullable: true,
  })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '生效开始时间',
  })
  effectiveTimeStart!: Date | null

  @ApiPropertyOptional({
    description: '生效结束时间。未设置时为 null',
    example: '2026-12-31 23:59:59',
    nullable: true,
  })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '生效结束时间',
  })
  effectiveTimeEnd!: Date | null

  @ApiProperty({ description: '项目名称', example: '2026 社招项目' })
  @Column({
    type: 'varchar',
    length: 100,
    default: '',
    comment: '项目名称',
  })
  name!: string

  @ApiProperty({
    description: '项目类型：1 社招，2 校招',
    enum: ['1', '2'],
    example: '1',
  })
  @Column({ type: 'char', length: 1, comment: '项目类型：1 社招，2 校招' })
  type!: ProjectType

  @ApiProperty({ description: '是否启用', example: true })
  @Column({ type: 'boolean', default: true, comment: '启用/禁用' })
  isEnabled!: boolean

  @ApiProperty({ description: '是否系统默认项目', example: false })
  @Column({ type: 'boolean', default: false, comment: '系统默认' })
  isSystemDefault!: boolean
}
