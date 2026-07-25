import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiPropertyOptional({
    description: '头像 URL',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiProperty({ description: '用户名，系统内唯一', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string

  @ApiProperty({ description: '用户昵称', example: '管理员' })
  @IsString()
  @IsNotEmpty()
  nickname!: string

  @ApiProperty({
    description: '邮箱地址，系统内唯一',
    example: 'admin@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({ description: '登录密码', example: 'plain-password' })
  @IsString()
  @IsNotEmpty()
  password!: string

  @ApiProperty({ description: '是否启用用户', example: true })
  @IsBoolean()
  isEnabled!: boolean
}
