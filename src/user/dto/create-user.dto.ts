import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

export class CreateUserDto {
  @IsOptional()
  @IsString()
  avatar?: string

  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @IsNotEmpty()
  nickname!: string

  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string

  @IsBoolean()
  isEnabled!: boolean
}
