import { User } from '../entities/user.entity'

export abstract class UserRepository {
  abstract existsByUsername(username: string): Promise<boolean>

  abstract existsByEmail(email: string): Promise<boolean>

  abstract create(data: Partial<User>): User

  abstract save(user: User): Promise<User>

  abstract findAll(): Promise<User[]>
}
