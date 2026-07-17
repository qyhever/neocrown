import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AuthController } from '../src/auth/auth.controller'
import { AuthService } from '../src/auth/auth.service'
import { VerificationCodeService } from '../src/auth/verification-code.service'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { ResponseMessageEnum } from '../src/common/enums/response-message.enum'
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard'
import { UserController } from '../src/user/user.controller'
import { UserService } from '../src/user/user.service'

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    register: jest.fn(),
  }
  const verificationCodeService = { sendRegistrationCode: jest.fn() }
  const jwtService = { verifyAsync: jest.fn() }
  const userService = {
    batchDelete: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      controllers: [AuthController, UserController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: VerificationCodeService,
          useValue: verificationCodeService,
        },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('neocrown-test') },
        },
        { provide: UserService, useValue: userService },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('/api')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new GlobalExceptionFilter())
    await app.init()
  })

  it('POST /auth/registration-code 应该发送注册验证码', async () => {
    verificationCodeService.sendRegistrationCode.mockResolvedValue(undefined)

    await request(app.getHttpServer())
      .post('/api/auth/registration-code')
      .send({ email: ' USER@example.com ' })
      .expect(201)
      .expect({ success: true, data: null, message: '创建成功' })

    expect(verificationCodeService.sendRegistrationCode).toHaveBeenCalledWith(
      'user@example.com',
    )
  })

  it('POST /auth/register 应该注册用户', async () => {
    authService.register.mockResolvedValue({
      id: 1,
      username: 'new-user',
      email: 'new-user@example.com',
    })

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'new-user',
        nickname: '新用户',
        email: 'new-user@example.com',
        password: 'password123',
        verificationCode: '123456',
      })
      .expect(201)
      .expect(({ body }: { body: { success: boolean } }) => {
        expect(body.success).toBe(true)
      })
  })

  it('POST /auth/register 不应该接受客户端设置 isEnabled', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'new-user',
        nickname: '新用户',
        email: 'new-user@example.com',
        password: 'password123',
        verificationCode: '123456',
        isEnabled: false,
      })
      .expect(400)

    expect(authService.register).not.toHaveBeenCalled()
  })

  it('POST /auth/login 应该规范化邮箱并返回双令牌', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ' USER@Example.com ', password: 'password123' })
      .expect(200)
      .expect({
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
        message: ResponseMessageEnum.LOGIN_SUCCESS,
      })

    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('POST /auth/login 应该拒绝非法请求参数', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'invalid-email',
        password: '',
        username: 'unexpected',
      })
      .expect(400)

    expect(authService.login).not.toHaveBeenCalled()
  })

  it.each([
    ['邮箱不存在', ResponseMessageEnum.USER_NOT_FOUND],
    ['密码错误', ResponseMessageEnum.PASSWORD_INCORRECT],
  ])(
    'POST /auth/login %s时应该返回 HTTP 200 逻辑错误',
    async (_case, message) => {
      authService.login.mockResolvedValue({ error: true, message })

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(200)
        .expect({ success: false, data: null, message })
    },
  )

  it('POST /auth/login 禁用用户应该返回 HTTP 403 标准失败响应', async () => {
    authService.login.mockRejectedValue(
      new ForbiddenException(ResponseMessageEnum.USER_DISABLED),
    )

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(403)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.USER_DISABLED,
        })
      })
  })

  it('POST /auth/refresh 应该以 HTTP 200 返回新的双令牌', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' })
      .expect(200)
      .expect({
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
        message: ResponseMessageEnum.REFRESH_TOKEN_SUCCESS,
      })

    expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token')
  })

  it.each([
    ['空令牌', { refreshToken: '' }],
    ['缺少令牌', {}],
    ['非字符串令牌', { refreshToken: 123 }],
    ['未知字段', { refreshToken: 'refresh-token', unexpected: true }],
  ])('POST /auth/refresh 应该拒绝%s', async (_case, body) => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send(body)
      .expect(400)

    expect(authService.refresh).not.toHaveBeenCalled()
  })

  it('POST /auth/refresh 无效令牌应该返回 HTTP 401', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      ),
    )

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-refresh-token' })
      .expect(401)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
        })
      })
  })

  it('POST /auth/refresh 禁用用户应该返回 HTTP 403', async () => {
    authService.refresh.mockRejectedValue(
      new ForbiddenException(ResponseMessageEnum.USER_DISABLED),
    )

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'disabled-user-refresh-token' })
      .expect(403)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.USER_DISABLED,
        })
      })
  })

  it('GET /user 缺少 access token 应该返回统一 HTTP 401 响应', async () => {
    await request(app.getHttpServer())
      .get('/api/user')
      .expect(401)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
        })
      })

    expect(userService.findAll).not.toHaveBeenCalled()
  })

  it('GET /user 携带有效 access token 应该继续执行', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'access' })
    userService.findAll.mockResolvedValue([])

    await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .expect({ success: true, data: [], message: '查询成功' })

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-access-token', {
      issuer: 'neocrown-test',
    })
    expect(userService.findAll).toHaveBeenCalledTimes(1)
  })

  it('GET /user/me 应该根据 access token 返回当前用户信息', async () => {
    const user = {
      id: 7,
      username: 'current-user',
      nickname: '当前用户',
      email: 'current-user@example.com',
    }
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'access' })
    userService.findOne.mockResolvedValue(user)

    await request(app.getHttpServer())
      .get('/api/user/me')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .expect({ success: true, data: user, message: '查询成功' })

    expect(userService.findOne).toHaveBeenCalledWith(7)
  })

  it('GET /user/me 缺少 access token 时不应该查询用户', async () => {
    await request(app.getHttpServer())
      .get('/api/user/me')
      .expect(401)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
        })
      })

    expect(userService.findOne).not.toHaveBeenCalled()
  })

  afterEach(async () => {
    await app.close()
  })
})
