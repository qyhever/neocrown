import { Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export const USER_PAGE_DATE_FIELDS = ['createdAt', 'updatedAt'] as const
export type UserPageDateField = (typeof USER_PAGE_DATE_FIELDS)[number]

export const USER_PAGE_SORT_VALUES = ['asc', 'desc'] as const
export type UserPageSortValue = (typeof USER_PAGE_SORT_VALUES)[number]

const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

export class FindUsersPageDto {
  @ApiPropertyOptional({ description: '当前页码', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  currentPage: number = 1

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  pageSize: number = 10

  @ApiPropertyOptional({
    description: '排序字段',
    enum: USER_PAGE_DATE_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(USER_PAGE_DATE_FIELDS)
  sortField: UserPageDateField = 'createdAt'

  @ApiPropertyOptional({
    description: '排序方向',
    enum: USER_PAGE_SORT_VALUES,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(USER_PAGE_SORT_VALUES)
  sortValue: UserPageSortValue = 'desc'

  @ApiPropertyOptional({ description: '用户名模糊查询', example: 'admin' })
  @IsOptional()
  @IsString()
  username?: string

  @ApiPropertyOptional({
    description: '邮箱模糊查询',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string

  @ApiPropertyOptional({ description: '昵称模糊查询', example: '管理员' })
  @IsOptional()
  @IsString()
  nickname?: string

  @ApiPropertyOptional({
    description: '日期筛选字段，未传时默认使用 createdAt',
    enum: USER_PAGE_DATE_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(USER_PAGE_DATE_FIELDS)
  dataType?: UserPageDateField

  @ApiPropertyOptional({
    description: '日期范围，格式为 YYYY-MM-DD HH:mm:ss。空数组表示不按日期过滤',
    example: ['2026-07-01 00:00:00', '2026-07-31 23:59:59'],
    default: [],
    type: [String],
  })
  @Transform(({ value }: { value: unknown }) => value ?? [])
  @IsArray()
  @ValidateIf((_, value: unknown[]) => value.length > 0)
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @Matches(dateTimePattern, { each: true })
  rangeDate: string[] = []
}
