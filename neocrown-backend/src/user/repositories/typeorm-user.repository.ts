import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { FindUsersPageDto } from '../dto/find-users-page.dto'
import { User } from '../entities/user.entity'
import { UserPageQueryResult, UserRepository } from './user.repository'

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  existsByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.getRepository(manager).existsBy({ username })
  }

  existsByEmail(email: string, manager?: EntityManager): Promise<boolean> {
    return this.getRepository(manager).existsBy({ email })
  }

  findLoginUserByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      select: { id: true, isEnabled: true, password: true },
    })
  }

  create(data: Partial<User>, manager?: EntityManager): User {
    return this.getRepository(manager).create(data)
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return this.getRepository(manager).save(user)
  }

  findAll(): Promise<User[]> {
    return this.repository.find()
  }

  async findPage(query: FindUsersPageDto): Promise<UserPageQueryResult> {
    const queryBuilder = this.repository.createQueryBuilder('user')

    if (query.username) {
      queryBuilder.andWhere('user.username LIKE :username', {
        username: `%${query.username}%`,
      })
    }

    if (query.email) {
      queryBuilder.andWhere('user.email LIKE :email', {
        email: `%${query.email}%`,
      })
    }

    if (query.nickname) {
      queryBuilder.andWhere('user.nickname LIKE :nickname', {
        nickname: `%${query.nickname}%`,
      })
    }

    if (query.rangeDate.length > 0) {
      const [startDate, endDate] = query.rangeDate
      const dataType = query.dataType ?? 'createdAt'
      queryBuilder.andWhere(
        `user.${dataType} BETWEEN :startDate AND :endDate`,
        {
          startDate,
          endDate,
        },
      )
    }

    const [list, total] = await queryBuilder
      .orderBy(
        `user.${query.sortField}`,
        query.sortValue.toUpperCase() as 'ASC' | 'DESC',
      )
      .skip((query.currentPage - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount()

    return { list, total }
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id })
  }

  findByIds(ids: number[]): Promise<User[]> {
    return this.repository.findBy({ id: In(ids) })
  }

  softRemove(user: User): Promise<User> {
    return this.repository.softRemove(user)
  }

  softRemoveMany(users: User[]): Promise<User[]> {
    return this.repository.softRemove(users)
  }

  private getRepository(manager?: EntityManager): Repository<User> {
    return manager?.getRepository(User) ?? this.repository
  }
}
