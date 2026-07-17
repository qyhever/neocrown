import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** @deprecated 临时兼容入口，可绕过邮箱验证，请改用 POST /auth/register。 */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  @Get()
  findAll() {
    return this.userService.findAll()
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('删除成功')
  batchDelete(@Body() batchDeleteUsersDto: BatchDeleteUsersDto) {
    return this.userService.batchDelete(batchDeleteUsersDto)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id)
  }

  @Patch()
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id)
  }
}
