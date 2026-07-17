import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator'

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @IsNotEmpty()
  nickname!: string

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsString()
  @Matches(/^\d{6}$/)
  verificationCode!: string
}
