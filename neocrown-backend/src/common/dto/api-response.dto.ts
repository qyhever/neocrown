import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ApiResponseDto {
  @ApiProperty({ description: '请求是否成功', example: true })
  success!: boolean

  @ApiProperty({ description: '响应数据，失败时为 null', nullable: true })
  data!: unknown

  @ApiProperty({ description: '响应消息', example: '操作成功' })
  message!: string
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: '请求是否成功', example: false })
  success!: boolean

  @ApiProperty({
    description: '响应数据，失败时为 null',
    type: 'null',
    example: null,
  })
  data!: null

  @ApiProperty({
    description: '错误消息',
    example: '访问令牌无效或已过期',
  })
  message!: string

  @ApiPropertyOptional({
    description: '请求 ID。由全局异常过滤器返回，用于日志排查',
    example: '018f5ad2-89ab-7cc8-a5a1-7c6b54ef77c6',
  })
  requestId?: string
}
