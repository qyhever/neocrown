import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { In, Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { TypeOrmUserRepository } from './typeorm-user.repository'

type TypeOrmRepositoryMock = {
  [
    Method in
      | 'create'
      | 'existsBy'
      | 'find'
      | 'findBy'
      | 'findOne'
      | 'findOneBy'
      | 'save'
      | 'softRemove'
  ]: jest.MockedFunction<Repository<User>[Method]>
}

describe('TypeOrmUserRepository', () => {
  let repository: TypeOrmUserRepository
  let typeOrmRepository: TypeOrmRepositoryMock

  beforeEach(async () => {
    typeOrmRepository = {
      create: jest.fn(),
      existsBy: jest.fn(),
      find: jest.fn(),
      findBy: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
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

  it('应该按邮箱查询未软删除用户并显式读取密码', async () => {
    const user = {
      id: 1,
      isEnabled: true,
      password: 'password-hash',
    } as User
    typeOrmRepository.findOne.mockResolvedValue(user)

    await expect(
      repository.findLoginUserByEmail('admin@example.com'),
    ).resolves.toBe(user)
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
      select: { id: true, isEnabled: true, password: true },
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

  it('应该按 ID 查询单个用户', async () => {
    const user = { id: 1, username: 'admin' } as User
    typeOrmRepository.findOneBy.mockResolvedValue(user)

    await expect(repository.findById(1)).resolves.toBe(user)
    expect(typeOrmRepository.findOneBy).toHaveBeenCalledWith({ id: 1 })
  })

  it('应该使用 IN 条件按 ID 集合查询用户', async () => {
    const users = [{ id: 1 }, { id: 2 }] as User[]
    typeOrmRepository.findBy.mockResolvedValue(users)

    await expect(repository.findByIds([1, 2])).resolves.toBe(users)
    expect(typeOrmRepository.findBy).toHaveBeenCalledWith({
      id: In([1, 2]),
    })
  })

  it('应该软删除用户实体', async () => {
    const user = { id: 1, username: 'admin' } as User
    const removedUser = { ...user, deletedAt: new Date() } as User
    typeOrmRepository.softRemove.mockResolvedValue(removedUser)

    await expect(repository.softRemove(user)).resolves.toBe(removedUser)
    expect(typeOrmRepository.softRemove).toHaveBeenCalledWith(user)
  })

  it('应该以数组形式批量软删除用户实体', async () => {
    const users = [{ id: 1 }, { id: 2 }] as User[]
    const removedUsers = users.map((user) => ({
      ...user,
      deletedAt: new Date(),
    })) as User[]
    typeOrmRepository.softRemove.mockResolvedValue(removedUsers)

    await expect(repository.softRemoveMany(users)).resolves.toBe(removedUsers)
    expect(typeOrmRepository.softRemove).toHaveBeenCalledWith(users)
  })
})
