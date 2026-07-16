import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'
import { UserService } from './user.service'

describe('UserService', () => {
  let service: UserService
  let userRepository: jest.Mocked<Pick<Repository<User>, 'find'>>

  beforeEach(async () => {
    userRepository = {
      find: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: 1, username: 'admin' }] as User[]
      userRepository.find.mockResolvedValue(users)

      await expect(service.findAll()).resolves.toEqual(users)
      expect(userRepository.find).toHaveBeenCalledTimes(1)
    })
  })
})
