import { ApiProperty } from '@nestjs/swagger'

class SkippedUserDeleteDto {
  @ApiProperty({ description: '未删除的用户 ID', example: 3 })
  id!: number

  @ApiProperty({ description: '未删除原因', example: '用户不存在' })
  reason!: string
}

export class BatchDeleteUsersResultDto {
  @ApiProperty({
    description: '已成功软删除的用户 ID 列表',
    example: [1, 2],
    type: [Number],
  })
  deletedIds!: number[]

  @ApiProperty({
    description: '跳过删除的用户及原因',
    type: [SkippedUserDeleteDto],
  })
  skipped!: SkippedUserDeleteDto[]
}
