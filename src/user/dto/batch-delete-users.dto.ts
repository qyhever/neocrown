import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BatchDeleteUsersDto {
  @ApiProperty({
    description: '要批量软删除的用户 ID 列表。必须为非空、去重的正整数数组',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  ids!: number[]
}
