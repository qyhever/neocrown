import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto'
import { HTTP_CODE_METADATA } from '@nestjs/common/constants'
import { SUCCESS_MESSAGE_KEY } from '../common/decorators/success-message.decorator'

describe('UserController', () => {
  let controller: UserController
  let userService: {
    findOne: jest.MockedFunction<UserService['findOne']>
    update: jest.MockedFunction<UserService['update']>
    remove: jest.MockedFunction<UserService['remove']>
    batchDelete: jest.MockedFunction<UserService['batchDelete']>
  }

  beforeEach(async () => {
    userService = {
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      batchDelete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile()

    controller = module.get<UserController>(UserController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('findOne 应该将 ID 传给 UserService', async () => {
    const user = { id: 1, username: 'admin' } as User
    userService.findOne.mockResolvedValue(user)

    await expect(controller.findOne(1)).resolves.toBe(user)
    expect(userService.findOne).toHaveBeenCalledWith(1)
  })

  it('update 应该将更新 DTO 传给 UserService', async () => {
    const updateUserDto: UpdateUserDto = {
      id: 1,
      nickname: '新昵称',
    }
    const user = { id: 1, nickname: '新昵称' } as User
    userService.update.mockResolvedValue(user)

    await expect(controller.update(updateUserDto)).resolves.toBe(user)
    expect(userService.update).toHaveBeenCalledWith(updateUserDto)
  })

  it('remove 应该将 ID 传给 UserService', async () => {
    const user = { id: 1, username: 'admin' } as User
    userService.remove.mockResolvedValue(user)

    await expect(controller.remove(1)).resolves.toBe(user)
    expect(userService.remove).toHaveBeenCalledWith(1)
  })

  it('batchDelete 应该将 DTO 传给 UserService', async () => {
    const dto: BatchDeleteUsersDto = { ids: [1, 2] }
    const result = { deletedIds: [], skipped: [] }
    userService.batchDelete.mockResolvedValue(result)

    await expect(controller.batchDelete(dto)).resolves.toBe(result)
    expect(userService.batchDelete).toHaveBeenCalledWith(dto)
  })

  it('batchDelete 应该返回 HTTP 200 并配置删除成功消息', () => {
    const handler = Reflect.get(UserController.prototype, 'batchDelete')

    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200)
    expect(Reflect.getMetadata(SUCCESS_MESSAGE_KEY, handler)).toBe('删除成功')
  })
})
