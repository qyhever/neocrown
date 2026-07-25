import { ApiProperty } from '@nestjs/swagger'

export class AuthTokensDto {
  @ApiProperty({
    description: '访问令牌。调用受保护接口时放入 Authorization: Bearer <token>',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
  })
  accessToken!: string

  @ApiProperty({
    description: '刷新令牌。访问令牌过期后用于换取新的令牌对',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
  })
  refreshToken!: string
}
