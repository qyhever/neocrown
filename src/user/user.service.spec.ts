import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { compare, getRounds } from 'bcryptjs'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UserRepository } from './repositories/user.repository'
import { UserService } from './user.service'

type UserRepositoryMock = {
  [Method in keyof UserRepository]: jest.MockedFunction<UserRepository[Method]>
}

describe('UserService', () => {
  let service: UserService
  let userRepository: UserRepositoryMock

  beforeEach(async () => {
    userRepository = {
      create: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findAll: jest.fn(),
      findLoginUserByEmail: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      softRemoveMany: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(10),
          },
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    beforeEach(() => {
      userRepository.existsByUsername.mockResolvedValue(false)
      userRepository.existsByEmail.mockResolvedValue(false)
    })

    it('应该对明文密码加盐哈希后入库', async () => {
      const createUserDto: CreateUserDto = {
        username: 'admin',
        nickname: '管理员',
        email: 'admin@example.com',
        password: 'plain-password',
        isEnabled: true,
      }
      const user = { id: 1, username: 'admin' } as User
      userRepository.create.mockReturnValue(user)
      userRepository.save.mockResolvedValue(user)

      await expect(service.create(createUserDto)).resolves.toBe(user)

      const createPayload = userRepository.create.mock.calls[0][0]
      expect(createPayload).toMatchObject({
        username: 'admin',
        nickname: '管理员',
        email: 'admin@example.com',
        isEnabled: true,
      })
      expect(createPayload.password).not.toBe(createUserDto.password)
      expect(getRounds(createPayload.password as string)).toBe(10)
      await expect(
        compare(createUserDto.password, createPayload.password as string),
      ).resolves.toBe(true)
      expect(userRepository.save).toHaveBeenCalledWith(user)
    })

    it('用户名已存在时不应创建用户', async () => {
      userRepository.existsByUsername.mockResolvedValue(true)

      await expect(
        service.create({
          username: 'admin',
          nickname: '管理员',
          email: 'new@example.com',
          password: 'plain-password',
          isEnabled: true,
        }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
      })
      expect(userRepository.create).not.toHaveBeenCalled()
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('邮箱已存在时不应创建用户', async () => {
      userRepository.existsByEmail.mockResolvedValue(true)

      await expect(
        service.create({
          username: 'new-admin',
          nickname: '新管理员',
          email: 'admin@example.com',
          password: 'plain-password',
          isEnabled: true,
        }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.EMAIL_ALREADY_EXISTS,
      })
      expect(userRepository.create).not.toHaveBeenCalled()
      expect(userRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: 1, username: 'admin' }] as User[]
      userRepository.findAll.mockResolvedValue(users)

      await expect(service.findAll()).resolves.toEqual(users)
      expect(userRepository.findAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('findLoginUserByEmail', () => {
    it('应该透传规范化邮箱到仓储登录查询', async () => {
      const user = { id: 1, password: 'password-hash' } as User
      userRepository.findLoginUserByEmail.mockResolvedValue(user)

      await expect(
        service.findLoginUserByEmail('admin@example.com'),
      ).resolves.toBe(user)
      expect(userRepository.findLoginUserByEmail).toHaveBeenCalledWith(
        'admin@example.com',
      )
    })
  })

  describe('findOne', () => {
    it('应该返回指定 ID 的用户', async () => {
      const user = { id: 1, username: 'admin' } as User
      userRepository.findById.mockResolvedValue(user)

      await expect(service.findOne(1)).resolves.toBe(user)
      expect(userRepository.findById).toHaveBeenCalledWith(1)
    })

    it('用户不存在时应该返回错误结果', async () => {
      userRepository.findById.mockResolvedValue(null)

      await expect(service.findOne(999)).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      })
    })
  })

  describe('update', () => {
    const createExistingUser = (): User =>
      ({
        id: 1,
        username: 'admin',
        nickname: '管理员',
        email: 'admin@example.com',
        avatar: null,
        isEnabled: true,
        deletedAt: null,
      }) as User

    beforeEach(() => {
      userRepository.existsByUsername.mockResolvedValue(false)
      userRepository.existsByEmail.mockResolvedValue(false)
    })

    it.each([
      ['不存在', null],
      ['已软删除', { ...createExistingUser(), deletedAt: new Date() }],
    ])('用户%s时应该返回错误且不保存', async (_state, existingUser) => {
      userRepository.findById.mockResolvedValue(existingUser)

      await expect(service.update({ id: 1 })).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      })
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('用户名变更发生冲突时应该返回对应错误', async () => {
      userRepository.findById.mockResolvedValue(createExistingUser())
      userRepository.existsByUsername.mockResolvedValue(true)

      await expect(
        service.update({ id: 1, username: 'another-admin' }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
      })
      expect(userRepository.existsByUsername).toHaveBeenCalledWith(
        'another-admin',
      )
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('邮箱变更发生冲突时应该返回对应错误', async () => {
      userRepository.findById.mockResolvedValue(createExistingUser())
      userRepository.existsByEmail.mockResolvedValue(true)

      await expect(
        service.update({ id: 1, email: 'another@example.com' }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.EMAIL_ALREADY_EXISTS,
      })
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(
        'another@example.com',
      )
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('用户名和邮箱未变化时不应该执行重复性查询', async () => {
      const user = createExistingUser()
      userRepository.findById.mockResolvedValue(user)

      await expect(
        service.update({
          id: 1,
          username: user.username,
          email: user.email,
        }),
      ).resolves.toBe(user)
      expect(userRepository.existsByUsername).not.toHaveBeenCalled()
      expect(userRepository.existsByEmail).not.toHaveBeenCalled()
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('应该合并普通字段并保存已查询到的用户实体', async () => {
      const user = createExistingUser()
      const updateUserDto: UpdateUserDto = {
        id: 1,
        nickname: '新昵称',
        avatar: 'https://example.com/avatar.png',
        isEnabled: false,
      }
      userRepository.findById.mockResolvedValue(user)
      userRepository.save.mockResolvedValue(user)

      await expect(service.update(updateUserDto)).resolves.toBe(user)
      expect(userRepository.save).toHaveBeenCalledWith(user)
      expect(user).toMatchObject({
        id: 1,
        nickname: '新昵称',
        avatar: 'https://example.com/avatar.png',
        isEnabled: false,
      })
    })

    it('应该先哈希新密码再保存且不保留明文', async () => {
      const user = createExistingUser()
      userRepository.findById.mockResolvedValue(user)
      userRepository.save.mockResolvedValue(user)

      await service.update({ id: 1, password: 'new-password' })

      expect(user.password).not.toBe('new-password')
      expect(getRounds(user.password)).toBe(10)
      await expect(compare('new-password', user.password)).resolves.toBe(true)
      expect(userRepository.save).toHaveBeenCalledWith(user)
    })

    it('只有 ID 时应该返回当前用户且不保存', async () => {
      const user = createExistingUser()
      userRepository.findById.mockResolvedValue(user)

      await expect(service.update({ id: 1 })).resolves.toBe(user)
      expect(userRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    const createExistingUser = (): User =>
      ({
        id: 1,
        username: 'admin',
        isSystemDefault: false,
        deletedAt: null,
      }) as User

    it.each([
      ['不存在', null],
      ['已软删除', { ...createExistingUser(), deletedAt: new Date() }],
    ])('用户%s时应该返回错误且不执行删除', async (_state, existingUser) => {
      userRepository.findById.mockResolvedValue(existingUser)

      await expect(service.remove(1)).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      })
      expect(userRepository.softRemove).not.toHaveBeenCalled()
    })

    it('系统默认用户不应该被删除', async () => {
      userRepository.findById.mockResolvedValue({
        ...createExistingUser(),
        isSystemDefault: true,
      })

      await expect(service.remove(1)).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_DELETED,
      })
      expect(userRepository.softRemove).not.toHaveBeenCalled()
    })

    it('应该软删除指定用户', async () => {
      const user = createExistingUser()
      const removedUser = { ...user, deletedAt: new Date() } as User
      userRepository.findById.mockResolvedValue(user)
      userRepository.softRemove.mockResolvedValue(removedUser)

      await expect(service.remove(1)).resolves.toBe(removedUser)
      expect(userRepository.findById).toHaveBeenCalledWith(1)
      expect(userRepository.softRemove).toHaveBeenCalledWith(user)
    })
  })

  describe('batchDelete', () => {
    const createUser = (id: number, overrides: Partial<User> = {}): User =>
      ({
        id,
        username: `user-${id}`,
        isSystemDefault: false,
        deletedAt: null,
        ...overrides,
      }) as User

    it('应该按请求顺序批量软删除全部普通用户', async () => {
      const users = [createUser(3), createUser(1), createUser(2)]
      const requestedOrder = [users[1], users[2], users[0]]
      const removedUsers = requestedOrder.map((user) => ({
        ...user,
        deletedAt: new Date(),
      })) as User[]
      userRepository.findByIds.mockResolvedValue(users)
      userRepository.softRemoveMany.mockResolvedValue(removedUsers)

      await expect(service.batchDelete({ ids: [1, 2, 3] })).resolves.toEqual({
        deletedIds: [1, 2, 3],
        skipped: [],
      })
      expect(userRepository.findByIds).toHaveBeenCalledWith([1, 2, 3])
      expect(userRepository.softRemoveMany).toHaveBeenCalledWith(requestedOrder)
    })

    it('应该按请求顺序分类不存在、已删除、系统默认和普通用户', async () => {
      const deletedUser = createUser(2, { deletedAt: new Date() })
      const systemUser = createUser(3, { isSystemDefault: true })
      const deletableUser = createUser(4)
      const removedUser = createUser(4, { deletedAt: new Date() })
      userRepository.findByIds.mockResolvedValue([
        deletableUser,
        systemUser,
        deletedUser,
      ])
      userRepository.softRemoveMany.mockResolvedValue([removedUser])

      await expect(service.batchDelete({ ids: [4, 1, 3, 2] })).resolves.toEqual(
        {
          deletedIds: [4],
          skipped: [
            { id: 1, reason: ResponseMessageEnum.USER_NOT_FOUND },
            {
              id: 3,
              reason: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_DELETED,
            },
            { id: 2, reason: ResponseMessageEnum.USER_NOT_FOUND },
          ],
        },
      )
      expect(userRepository.softRemoveMany).toHaveBeenCalledWith([
        deletableUser,
      ])
    })

    it('全部不可删除时应该返回成功结果且不执行批量软删除', async () => {
      userRepository.findByIds.mockResolvedValue([
        createUser(2, { isSystemDefault: true }),
      ])

      await expect(service.batchDelete({ ids: [1, 2] })).resolves.toEqual({
        deletedIds: [],
        skipped: [
          { id: 1, reason: ResponseMessageEnum.USER_NOT_FOUND },
          {
            id: 2,
            reason: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_DELETED,
          },
        ],
      })
      expect(userRepository.softRemoveMany).not.toHaveBeenCalled()
    })

    it('批量软删除失败时应该向上抛出异常', async () => {
      const error = new Error('database error')
      userRepository.findByIds.mockResolvedValue([createUser(1)])
      userRepository.softRemoveMany.mockRejectedValue(error)

      await expect(service.batchDelete({ ids: [1] })).rejects.toBe(error)
    })
  })
})
