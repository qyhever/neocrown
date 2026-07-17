import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { hash } from 'bcryptjs'
import { DataSource, type EntityManager } from 'typeorm'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import { User } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { EmailVerificationCode } from './entities/email-verification-code.entity'
import { VerificationCodeService } from './verification-code.service'

type TokenPayload = {
  sub: number
  type: 'access' | 'refresh'
  jti: string
}

type SignToken = (
  payload: TokenPayload,
  options: { expiresIn: string },
) => Promise<string>

type VerifyToken = (
  token: string,
  options: { issuer: string },
) => Promise<unknown>

describe('AuthService', () => {
  let service: AuthService
  let userService: {
    existsByUsername: jest.Mock
    existsByEmail: jest.Mock
    createRegistrationUser: jest.Mock
    findLoginUserByEmail: jest.Mock
    findOne: jest.Mock
  }
  let jwtService: {
    signAsync: jest.MockedFunction<SignToken>
    verifyAsync: jest.MockedFunction<VerifyToken>
  }
  let verificationCodeService: {
    normalizeEmail: jest.Mock
    verifyRegistrationCode: jest.Mock
    consume: jest.Mock
  }
  const manager = {} as EntityManager
  const dto: RegisterDto = {
    username: 'new-user',
    nickname: '新用户',
    email: 'USER@example.com',
    password: 'password123',
    verificationCode: '123456',
  }

  beforeEach(async () => {
    userService = {
      existsByUsername: jest.fn().mockResolvedValue(false),
      existsByEmail: jest.fn().mockResolvedValue(false),
      createRegistrationUser: jest.fn(),
      findLoginUserByEmail: jest.fn(),
      findOne: jest.fn(),
    }
    verificationCodeService = {
      normalizeEmail: jest.fn().mockReturnValue('user@example.com'),
      verifyRegistrationCode: jest.fn(),
      consume: jest.fn(),
    }
    const dataSource = {
      transaction: jest.fn((work: (manager: EntityManager) => unknown) =>
        work(manager),
      ),
    }
    jwtService = {
      signAsync: jest
        .fn<SignToken>()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn<VerifyToken>(),
    }
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: dataSource },
        { provide: UserService, useValue: userService },
        {
          provide: VerificationCodeService,
          useValue: verificationCodeService,
        },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                JWT_ACCESS_EXPIRE: '10m',
                JWT_REFRESH_EXPIRE: '7d',
                JWT_ISSUER: 'neocrown-test',
              }

              return values[key]
            }),
          },
        },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  describe('login', () => {
    it('密码正确时应该并行签发 Access Token 和 Refresh Token', async () => {
      const password = await hash('password123', 10)
      userService.findLoginUserByEmail.mockResolvedValue({
        id: 7,
        password,
        isEnabled: true,
      })

      await expect(
        service.login({ email: 'user@example.com', password: 'password123' }),
      ).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
      expect(userService.findLoginUserByEmail).toHaveBeenCalledWith(
        'user@example.com',
      )
      const [accessPayload, accessOptions] = jwtService.signAsync.mock.calls[0]
      const [refreshPayload, refreshOptions] =
        jwtService.signAsync.mock.calls[1]
      expect(accessPayload).toMatchObject({ sub: 7, type: 'access' })
      expect(refreshPayload).toMatchObject({ sub: 7, type: 'refresh' })
      expect(accessPayload.jti).not.toBe(refreshPayload.jti)
      expect(accessOptions).toEqual({ expiresIn: '10m' })
      expect(refreshOptions).toEqual({ expiresIn: '7d' })
    })

    it('邮箱不存在时应该返回逻辑错误且不签发令牌', async () => {
      userService.findLoginUserByEmail.mockResolvedValue(null)

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('密码错误时应该返回逻辑错误且不签发令牌', async () => {
      userService.findLoginUserByEmail.mockResolvedValue({
        id: 7,
        password: await hash('correct-password', 10),
        isEnabled: true,
      })

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).resolves.toEqual({
        error: true,
        message: ResponseMessageEnum.PASSWORD_INCORRECT,
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('禁用用户应该抛出 403 且不签发令牌', async () => {
      userService.findLoginUserByEmail.mockResolvedValue({
        id: 7,
        password: 'unused-password-hash',
        isEnabled: false,
      })

      await expect(
        service.login({ email: 'user@example.com', password: 'password123' }),
      ).rejects.toMatchObject({
        message: ResponseMessageEnum.USER_DISABLED,
        status: 403,
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('有效 Refresh Token 应该校验 issuer、查询用户并签发新的双令牌', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'refresh' })
      userService.findOne.mockResolvedValue({ id: 7, isEnabled: true })

      await expect(service.refresh('valid-refresh-token')).resolves.toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      })
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-refresh-token',
        { issuer: 'neocrown-test' },
      )
      expect(userService.findOne).toHaveBeenCalledWith(7)
      const [accessPayload, accessOptions] = jwtService.signAsync.mock.calls[0]
      const [refreshPayload, refreshOptions] =
        jwtService.signAsync.mock.calls[1]
      expect(accessPayload).toMatchObject({ sub: 7, type: 'access' })
      expect(refreshPayload).toMatchObject({ sub: 7, type: 'refresh' })
      expect(accessPayload.jti).not.toBe(refreshPayload.jti)
      expect(accessOptions).toEqual({ expiresIn: '10m' })
      expect(refreshOptions).toEqual({ expiresIn: '7d' })
    })

    it.each(['令牌过期', '签名伪造', '格式错误'])(
      '%s时应该返回 401',
      async () => {
        jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'))

        await expect(service.refresh('invalid-token')).rejects.toMatchObject({
          message: ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
          status: 401,
        })
        expect(userService.findOne).not.toHaveBeenCalled()
        expect(jwtService.signAsync).not.toHaveBeenCalled()
      },
    )

    it.each([
      ['Access Token 冒充', { sub: 7, type: 'access' }],
      ['缺少令牌类型', { sub: 7 }],
      ['用户 ID 为字符串', { sub: '7', type: 'refresh' }],
      ['用户 ID 为零', { sub: 0, type: 'refresh' }],
      ['用户 ID 为小数', { sub: 1.5, type: 'refresh' }],
    ])('%s时应该返回 401', async (_case, payload) => {
      jwtService.verifyAsync.mockResolvedValue(payload)

      await expect(
        service.refresh('wrong-payload-token'),
      ).rejects.toMatchObject({
        message: ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
        status: 401,
      })
      expect(userService.findOne).not.toHaveBeenCalled()
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('用户不存在或已删除时应该返回 401', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'refresh' })
      userService.findOne.mockResolvedValue({
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      })

      await expect(
        service.refresh('orphan-refresh-token'),
      ).rejects.toMatchObject({
        message: ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
        status: 401,
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })

    it('用户被禁用时应该返回 403', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'refresh' })
      userService.findOne.mockResolvedValue({ id: 7, isEnabled: false })

      await expect(
        service.refresh('disabled-refresh-token'),
      ).rejects.toMatchObject({
        message: ResponseMessageEnum.USER_DISABLED,
        status: 403,
      })
      expect(jwtService.signAsync).not.toHaveBeenCalled()
    })
  })

  it('正确验证码应该在同一事务中创建用户并消费验证码', async () => {
    const codeRecord = { id: 1 } as EmailVerificationCode
    const user = { id: 2, email: 'user@example.com' } as User
    verificationCodeService.verifyRegistrationCode.mockResolvedValue(codeRecord)
    userService.createRegistrationUser.mockResolvedValue(user)

    await expect(service.register(dto)).resolves.toBe(user)
    expect(userService.createRegistrationUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' }),
      manager,
    )
    expect(verificationCodeService.consume).toHaveBeenCalledWith(
      codeRecord,
      manager,
    )
  })

  it('用户名已存在时应该拒绝注册', async () => {
    userService.existsByUsername.mockResolvedValue(true)

    await expect(service.register(dto)).resolves.toEqual({
      error: true,
      message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
    })
    expect(
      verificationCodeService.verifyRegistrationCode,
    ).not.toHaveBeenCalled()
  })

  it('验证码错误时不应该创建用户', async () => {
    verificationCodeService.verifyRegistrationCode.mockResolvedValue({
      error: true,
      message: '验证码错误',
    })

    await expect(service.register(dto)).resolves.toEqual({
      error: true,
      message: '验证码错误',
    })
    expect(userService.createRegistrationUser).not.toHaveBeenCalled()
    expect(verificationCodeService.consume).not.toHaveBeenCalled()
  })

  it('用户创建失败时事务不应该消费验证码', async () => {
    verificationCodeService.verifyRegistrationCode.mockResolvedValue({
      id: 1,
    })
    userService.createRegistrationUser.mockRejectedValue(new Error('DB error'))

    await expect(service.register(dto)).rejects.toThrow('DB error')
    expect(verificationCodeService.consume).not.toHaveBeenCalled()
  })

  it('消费后的并发重放应该只有第一次成功', async () => {
    const record = { id: 1 } as EmailVerificationCode
    const user = { id: 2 } as User
    verificationCodeService.verifyRegistrationCode
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce({ error: true, message: '验证码无效或已过期' })
    userService.createRegistrationUser.mockResolvedValue(user)

    await expect(service.register(dto)).resolves.toBe(user)
    await expect(service.register(dto)).resolves.toEqual({
      error: true,
      message: '验证码无效或已过期',
    })
    expect(userService.createRegistrationUser).toHaveBeenCalledTimes(1)
    expect(verificationCodeService.consume).toHaveBeenCalledTimes(1)
  })
})
