import { ApiProperty } from '@nestjs/swagger'

export class AppMetaDto {
  @ApiProperty({
    description: '构建部署时间',
    example: '2026-07-17 10:30:00',
  })
  deployTime!: string
}
