import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { hash } from 'bcryptjs'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { ServiceErrorResult } from '../common/interceptors/response.interceptor'
import type { EnvironmentVariables } from '../config/environment.validation'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UserRepository } from './repositories/user.repository'

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

  findAll(): Promise<User[]> {
    return this.userRepository.findAll()
  }

  findOne(id: number) {
    return `This action returns a #${id} user`
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    void updateUserDto
    return `This action updates a #${id} user`
  }

  remove(id: number) {
    return `This action removes a #${id} user`
  }
}
