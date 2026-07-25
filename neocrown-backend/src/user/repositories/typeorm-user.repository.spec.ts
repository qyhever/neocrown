import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { In, Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { TypeOrmUserRepository } from './typeorm-user.repository'

type TypeOrmRepositoryMock = {
  [
    Method in
      | 'create'
      | 'createQueryBuilder'
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
      createQueryBuilder: jest.fn(),
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

  it('应该按分页、排序、模糊条件和日期范围查询用户', async () => {
    const users = [{ id: 1, username: 'admin' }] as User[]
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([users, 1]),
    }
    typeOrmRepository.createQueryBuilder.mockReturnValue(queryBuilder as never)

    await expect(
      repository.findPage({
        currentPage: 2,
        pageSize: 20,
        sortField: 'updatedAt',
        sortValue: 'asc',
        username: 'admin',
        email: 'example.com',
        nickname: '管理',
        dataType: 'updatedAt',
        rangeDate: ['2026-07-01 00:00:00', '2026-07-31 23:59:59'],
      }),
    ).resolves.toEqual({ list: users, total: 1 })

    expect(typeOrmRepository.createQueryBuilder).toHaveBeenCalledWith('user')
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.username LIKE :username',
      { username: '%admin%' },
    )
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.email LIKE :email',
      { email: '%example.com%' },
    )
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.nickname LIKE :nickname',
      { nickname: '%管理%' },
    )
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.updatedAt BETWEEN :startDate AND :endDate',
      {
        startDate: '2026-07-01 00:00:00',
        endDate: '2026-07-31 23:59:59',
      },
    )
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.updatedAt', 'ASC')
    expect(queryBuilder.skip).toHaveBeenCalledWith(20)
    expect(queryBuilder.take).toHaveBeenCalledWith(20)
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1)
  })

  it('rangeDate 为空时不应该添加日期范围条件', async () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    typeOrmRepository.createQueryBuilder.mockReturnValue(queryBuilder as never)

    await repository.findPage({
      currentPage: 1,
      pageSize: 10,
      sortField: 'createdAt',
      sortValue: 'desc',
      rangeDate: [],
    })

    expect(queryBuilder.andWhere).not.toHaveBeenCalled()
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC')
    expect(queryBuilder.skip).toHaveBeenCalledWith(0)
    expect(queryBuilder.take).toHaveBeenCalledWith(10)
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
    typeOrmRepository.softRemove.mockResolvedValue(removedUsers as never)

    await expect(repository.softRemoveMany(users)).resolves.toBe(removedUsers)
    expect(typeOrmRepository.softRemove).toHaveBeenCalledWith(users)
  })
})
