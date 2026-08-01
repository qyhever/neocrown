import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'
import type { ProjectType } from '../entities/project.entity'

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称', example: '2026 社招项目' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    description: '项目类型：1 社招，2 校招',
    enum: ['1', '2'],
    example: '1',
  })
  @IsEnum(['1', '2'])
  type!: ProjectType

  @ApiPropertyOptional({
    description: '项目描述',
    example: '社招项目',
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({
    description: '生效开始时间',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveTimeStart?: string

  @ApiPropertyOptional({
    description: '生效结束时间',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveTimeEnd?: string

  @ApiProperty({ description: '是否启用', example: true })
  @IsBoolean()
  isEnabled!: boolean
}
