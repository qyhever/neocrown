import { ApiProperty } from '@nestjs/swagger'

export class AuthTokensDto {
  @ApiProperty({
    description: '访问令牌。调用受保护接口时放入 Authorization: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
  })
  accessToken!: string
}
