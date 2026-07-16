import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { compare, getRounds } from 'bcryptjs'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import { CreateUserDto } from './dto/create-user.dto'
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
      save: jest.fn(),
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
})
