import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { hash } from 'bcryptjs'
import { Repository } from 'typeorm'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { ServiceErrorResult } from '../common/interceptors/response.interceptor'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<User | ServiceErrorResult> {
    const [usernameExists, emailExists] = await Promise.all([
      this.userRepository.existsBy({ username: createUserDto.username }),
      this.userRepository.existsBy({ email: createUserDto.email }),
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

    const password = await hash(createUserDto.password, 10)
    const user = this.userRepository.create({
      ...createUserDto,
      password,
    })

    return this.userRepository.save(user)
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find()
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
