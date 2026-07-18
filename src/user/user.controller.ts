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
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import type { RequestWithContext } from '../common/types/request-with-context'
import {
  ApiAccessTokenErrorResponse,
  ApiValidationErrorResponse,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { FindUsersPageDto } from './dto/find-users-page.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { BatchDeleteUsersResultDto } from './dto/batch-delete-users-result.dto'
import { UserPageResultDto } from './dto/user-page-result.dto'

@ApiTags('用户')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** @deprecated 临时兼容入口，可绕过邮箱验证，请改用 POST /auth/register。 */
  @Post()
  @ApiOperation({
    summary: '创建用户（已废弃）',
    description:
      '临时兼容入口，可绕过邮箱验证。新注册流程请使用 POST /auth/register',
    deprecated: true,
  })
  @ApiWrappedCreatedResponse({
    description: '创建用户请求已处理',
    message: '创建成功',
    data: { model: User },
  })
  @ApiValidationErrorResponse()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  @Get()
  @ApiOperation({ summary: '查询用户列表', description: '返回所有未删除用户' })
  @ApiWrappedOkResponse({
    description: '查询用户列表成功',
    message: '查询成功',
    data: { isArray: true, model: User },
  })
  findAll() {
    return this.userService.findAll()
  }

  @Post('page')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '分页查询用户列表',
    description: '按分页、排序、模糊条件和日期范围查询未删除用户',
  })
  @ApiWrappedOkResponse({
    description: '分页查询用户列表成功',
    message: '查询成功',
    data: { model: UserPageResultDto },
  })
  @ApiValidationErrorResponse()
  findPage(@Body() query: FindUsersPageDto) {
    return this.userService.findPage(query)
  }

  @Get('me')
  @ApiOperation({
    summary: '查询当前登录用户',
    description: '根据访问令牌中的用户 ID 查询当前用户详情',
  })
  @ApiWrappedOkResponse({
    description: '查询当前登录用户成功',
    message: '查询成功',
    data: { model: User },
  })
  findCurrentUser(@Req() request: RequestWithContext) {
    return this.userService.findOne(request.user!.id)
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('删除成功')
  @ApiOperation({
    summary: '批量删除用户',
    description: '批量软删除用户。不存在或系统默认用户会进入 skipped 列表',
  })
  @ApiWrappedOkResponse({
    description: '批量删除请求已处理',
    message: '删除成功',
    data: { model: BatchDeleteUsersResultDto },
  })
  @ApiValidationErrorResponse()
  batchDelete(@Body() batchDeleteUsersDto: BatchDeleteUsersDto) {
    return this.userService.batchDelete(batchDeleteUsersDto)
  }

  @Get(':id')
  @ApiOperation({
    summary: '查询指定用户',
    description: '根据用户 ID 查询用户详情。用户不存在时返回业务失败响应',
  })
  @ApiParam({ name: 'id', description: '用户 ID', example: 1, type: Number })
  @ApiWrappedOkResponse({
    description: '查询指定用户请求已处理',
    message: '查询成功',
    data: { model: User },
  })
  @ApiValidationErrorResponse()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id)
  }

  @Patch()
  @ApiOperation({
    summary: '更新用户',
    description:
      '根据请求体中的 id 更新用户资料。用户不存在、系统默认用户或唯一字段冲突时返回业务失败响应',
  })
  @ApiWrappedOkResponse({
    description: '更新用户请求已处理',
    message: '更新成功',
    data: { model: User },
  })
  @ApiValidationErrorResponse()
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto)
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除用户',
    description:
      '根据用户 ID 软删除用户。用户不存在或系统默认用户时返回业务失败响应',
  })
  @ApiParam({ name: 'id', description: '用户 ID', example: 1, type: Number })
  @ApiWrappedOkResponse({
    description: '删除用户请求已处理',
    message: '删除成功',
    data: { model: User },
  })
  @ApiValidationErrorResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id)
  }
}
