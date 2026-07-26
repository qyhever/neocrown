import { ApiProperty } from '@nestjs/swagger'

export class V2exHotTopicDto {
  @ApiProperty({ description: '热贴排名', example: 1 })
  rank: number

  @ApiProperty({ description: '帖子 ID', example: 123456 })
  id: number

  @ApiProperty({ description: '帖子标题', example: '今日热帖标题' })
  title: string

  @ApiProperty({
    description: '帖子绝对地址',
    example: 'https://v2ex.6688988.xyz/t/123456',
  })
  url: string

  @ApiProperty({
    description: '抓取来源首页地址',
    example: 'https://v2ex.6688988.xyz/',
  })
  sourceUrl: string

  @ApiProperty({
    description: '服务端抓取完成时间',
    example: '2026-07-25 18:00:00',
  })
  crawledAt: string
}

export class V2exHotTop10ResultDto {
  @ApiProperty({ description: 'V2EX 今日热贴 Top 10', type: [V2exHotTopicDto] })
  list: V2exHotTopicDto[]
}
