import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { TypeOrmUserRepository } from './typeorm-user.repository'

type TypeOrmRepositoryMock = {
  [Method in 'create' | 'existsBy' | 'find' | 'save']: jest.MockedFunction<
    Repository<User>[Method]
  >
}

describe('TypeOrmUserRepository', () => {
  let repository: TypeOrmUserRepository
  let typeOrmRepository: TypeOrmRepositoryMock

  beforeEach(async () => {
    typeOrmRepository = {
      create: jest.fn(),
      existsBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmUserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: typeOrmRepository,
        },
      ],
    }).compile()

    repository = module.get<TypeOrmUserRepository>(TypeOrmUserRepository)
  })

  it('应该按用户名判断用户是否存在', async () => {
    typeOrmRepository.existsBy.mockResolvedValue(true)

    await expect(repository.existsByUsername('admin')).resolves.toBe(true)
    expect(typeOrmRepository.existsBy).toHaveBeenCalledWith({
      username: 'admin',
    })
  })

  it('应该按邮箱判断用户是否存在', async () => {
    typeOrmRepository.existsBy.mockResolvedValue(true)

    await expect(repository.existsByEmail('admin@example.com')).resolves.toBe(
      true,
    )
    expect(typeOrmRepository.existsBy).toHaveBeenCalledWith({
      email: 'admin@example.com',
    })
  })

  it('应该创建并保存用户实体', async () => {
    const data = { username: 'admin' }
    const user = { id: 1, ...data } as User
    typeOrmRepository.create.mockReturnValue(user)
    typeOrmRepository.save.mockResolvedValue(user)

    expect(repository.create(data)).toBe(user)
    await expect(repository.save(user)).resolves.toBe(user)
    expect(typeOrmRepository.create).toHaveBeenCalledWith(data)
    expect(typeOrmRepository.save).toHaveBeenCalledWith(user)
  })

  it('应该查询全部用户', async () => {
    const users = [{ id: 1, username: 'admin' }] as User[]
    typeOrmRepository.find.mockResolvedValue(users)

    await expect(repository.findAll()).resolves.toBe(users)
    expect(typeOrmRepository.find).toHaveBeenCalledTimes(1)
  })
})
