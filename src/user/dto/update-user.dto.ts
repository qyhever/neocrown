import { ApiProperty, PartialType } from '@nestjs/swagger'
import { CreateUserDto } from './create-user.dto'
import { IsNotEmpty, IsNumber } from 'class-validator'

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: '要更新的用户 ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  id!: number
}
