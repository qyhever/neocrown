import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { hash } from 'bcryptjs'
import type { EntityManager } from 'typeorm'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { ServiceErrorResult } from '../common/interceptors/response.interceptor'
import type { EnvironmentVariables } from '../config/environment.validation'
import { CreateUserDto } from './dto/create-user.dto'
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UserRepository } from './repositories/user.repository'
import type { BatchDeleteUsersResult } from './types/batch-delete-users-result'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<User | ServiceErrorResult> {
    const [usernameExists, emailExists] = await Promise.all([
      this.userRepository.existsByUsername(createUserDto.username),
      this.userRepository.existsByEmail(createUserDto.email),
    ])

    if (usernameExists) {
      return {
        error: true,
        message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
      }
    }

    if (emailExists) {
      return {
        error: true,
        message: ResponseMessageEnum.EMAIL_ALREADY_EXISTS,
      }
    }

    const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
      infer: true,
    })
    const password = await hash(createUserDto.password, bcryptRounds)
    const user = this.userRepository.create({
      ...createUserDto,
      password,
    })

    return this.userRepository.save(user)
  }

  existsByEmail(email: string, manager?: EntityManager): Promise<boolean> {
    return this.userRepository.existsByEmail(email, manager)
  }

  findLoginUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findLoginUserByEmail(email)
  }

  existsByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.userRepository.existsByUsername(username, manager)
  }

  async createRegistrationUser(
    data: {
      username: string
      nickname: string
      email: string
      password: string
    },
    manager: EntityManager,
  ): Promise<User> {
    const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
      infer: true,
    })
    const password = await hash(data.password, bcryptRounds)
    const user = this.userRepository.create({ ...data, password }, manager)
    return this.userRepository.save(user, manager)
  }

  findAll(): Promise<User[]> {
    return this.userRepository.findAll()
  }

  async findOne(id: number): Promise<User | ServiceErrorResult> {
    const user = await this.userRepository.findById(id)

    if (!user) {
      return {
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      }
    }

    if (user.deletedAt) {
      return {
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      }
    }

    return user
  }

  async update(
    updateUserDto: UpdateUserDto,
  ): Promise<User | ServiceErrorResult> {
    const user = await this.userRepository.findById(updateUserDto.id)

    if (!user || user.deletedAt) {
      return {
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      }
    }

    if (user.isSystemDefault) {
      return {
        error: true,
        message: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_MODIFIED,
      }
    }

    const { username, email, password, nickname, avatar, isEnabled } =
      updateUserDto
    const usernameChanged = username !== undefined && username !== user.username
    const emailChanged = email !== undefined && email !== user.email

    const [usernameExists, emailExists] = await Promise.all([
      usernameChanged
        ? this.userRepository.existsByUsername(username)
        : Promise.resolve(false),
      emailChanged
        ? this.userRepository.existsByEmail(email)
        : Promise.resolve(false),
    ])

    if (usernameExists) {
      return {
        error: true,
        message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
      }
    }

    if (emailExists) {
      return {
        error: true,
        message: ResponseMessageEnum.EMAIL_ALREADY_EXISTS,
      }
    }

    let changed = false
    const assignIfChanged = <Key extends keyof User>(
      key: Key,
      value: User[Key] | undefined,
    ): void => {
      if (value !== undefined && value !== user[key]) {
        user[key] = value
        changed = true
      }
    }

    assignIfChanged('username', username)
    assignIfChanged('email', email)
    assignIfChanged('nickname', nickname)
    assignIfChanged('avatar', avatar)
    assignIfChanged('isEnabled', isEnabled)

    if (password !== undefined) {
      const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
        infer: true,
      })
      user.password = await hash(password, bcryptRounds)
      changed = true
    }

    if (!changed) {
      return user
    }

    return this.userRepository.save(user)
  }

  async remove(id: number): Promise<User | ServiceErrorResult> {
    const user = await this.userRepository.findById(id)

    if (!user || user.deletedAt) {
      return {
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      }
    }

    if (user.isSystemDefault) {
      return {
        error: true,
        message: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_DELETED,
      }
    }

    return this.userRepository.softRemove(user)
  }

  async batchDelete(
    batchDeleteUsersDto: BatchDeleteUsersDto,
  ): Promise<BatchDeleteUsersResult> {
    const users = await this.userRepository.findByIds(batchDeleteUsersDto.ids)
    const usersById = new Map(users.map((user) => [user.id, user]))
    const deletableUsers: User[] = []
    const skipped: BatchDeleteUsersResult['skipped'] = []

    for (const id of batchDeleteUsersDto.ids) {
      const user = usersById.get(id)

      if (!user || user.deletedAt) {
        skipped.push({ id, reason: ResponseMessageEnum.USER_NOT_FOUND })
      } else if (user.isSystemDefault) {
        skipped.push({
          id,
          reason: ResponseMessageEnum.SYSTEM_DEFAULT_USER_CANNOT_BE_DELETED,
        })
      } else {
        deletableUsers.push(user)
      }
    }

    const deletedUsers = deletableUsers.length
      ? await this.userRepository.softRemoveMany(deletableUsers)
      : []

    return {
      deletedIds: deletedUsers.map((user) => user.id),
      skipped,
    }
  }
}
