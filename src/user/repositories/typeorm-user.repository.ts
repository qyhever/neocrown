import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import { UserRepository } from './user.repository'

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  existsByUsername(username: string): Promise<boolean> {
    return this.repository.existsBy({ username })
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.repository.existsBy({ email })
  }

  create(data: Partial<User>): User {
    return this.repository.create(data)
  }

  save(user: User): Promise<User> {
    return this.repository.save(user)
  }

  findAll(): Promise<User[]> {
    return this.repository.find()
  }
}
