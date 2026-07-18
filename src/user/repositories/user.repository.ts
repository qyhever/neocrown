import { User } from '../entities/user.entity'
import type { EntityManager } from 'typeorm'
import type { FindUsersPageDto } from '../dto/find-users-page.dto'

export interface UserPageQueryResult {
  list: User[]
  total: number
}

export abstract class UserRepository {
  abstract existsByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<boolean>

  abstract existsByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<boolean>

  abstract findLoginUserByEmail(email: string): Promise<User | null>

  abstract create(data: Partial<User>, manager?: EntityManager): User

  abstract save(user: User, manager?: EntityManager): Promise<User>

  abstract findAll(): Promise<User[]>

  abstract findPage(query: FindUsersPageDto): Promise<UserPageQueryResult>

  abstract findById(id: number): Promise<User | null>

  abstract findByIds(ids: number[]): Promise<User[]>

  abstract softRemove(user: User): Promise<User>

  abstract softRemoveMany(users: User[]): Promise<User[]>
}
