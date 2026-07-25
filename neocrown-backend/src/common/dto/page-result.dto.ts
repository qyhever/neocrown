import { ApiProperty } from '@nestjs/swagger'

export class PageResultDto<T> {
  list!: T[]

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number

  @ApiProperty({ description: '当前页码', example: 1 })
  currentPage!: number

  @ApiProperty({ description: '每页数量', example: 10 })
  pageSize!: number
}
