import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class SendMailDto {
  @ApiProperty({
    description: '收件邮箱。服务端会去除首尾空格并转为小写',
    example: 'user@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  to!: string

  @ApiProperty({ description: '邮件主题', example: '系统通知' })
  @IsString()
  @IsNotEmpty()
  subject!: string

  @ApiProperty({ description: '纯文本邮件正文', example: '这是一封测试邮件。' })
  @IsString()
  @IsNotEmpty()
  body!: string
}
