import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ description: '用户名，系统内唯一', example: 'new-user' })
  @IsString()
  @IsNotEmpty()
  username!: string

  @ApiProperty({ description: '用户昵称', example: '新用户' })
  @IsString()
  @IsNotEmpty()
  nickname!: string

  @ApiProperty({
    description: '注册邮箱。服务端会去除首尾空格并转为小写',
    example: 'user@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @ApiProperty({ description: '登录密码', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password!: string

  @ApiProperty({
    description: '邮箱验证码，必须为 6 位数字',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/)
  verificationCode!: string
}
