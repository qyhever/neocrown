import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendRegistrationCodeDto {
  @ApiProperty({
    description: '接收注册验证码的邮箱。服务端会去除首尾空格并转为小写',
    example: 'user@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string
}
