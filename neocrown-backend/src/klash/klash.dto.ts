import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class GenerateKlashDto {
  @ApiProperty({
    description: '每行一个 IPv4 或 IPv6，保留重复项',
    example: '192.0.2.1\n2001:db8::1',
  })
  @IsString({ message: 'ips 必须是按换行分隔的字符串' })
  ips: string
}

export class GenerateKlashResultDto {
  @ApiProperty({ example: '20261027.yaml' })
  filename: string

  @ApiProperty({ example: 2 })
  ipCount: number

  @ApiProperty({ example: 3 })
  sourceNodeCount: number

  @ApiProperty({ example: 6 })
  generatedNodeCount: number
}
