import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { UserRepository } from './user.repository'

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
