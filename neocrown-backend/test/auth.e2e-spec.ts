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
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { App } from 'supertest/types'
import { AuthController } from '../src/auth/auth.controller'
import {
  AuthService,
  type LoginSuccessNotificationContext,
} from '../src/auth/auth.service'
import { VerificationCodeService } from '../src/auth/verification-code.service'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { ResponseMessageEnum } from '../src/common/enums/response-message.enum'
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard'
import { RequestContextMiddleware } from '../src/common/middleware/request-context.middleware'
import { UserController } from '../src/user/user.controller'
import { UserService } from '../src/user/user.service'

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>
  let nodeEnvironment = 'test'
  const authService = {
    login: jest.fn(),
    notifyLoginSuccess: jest
      .fn<(context: LoginSuccessNotificationContext) => Promise<void>>()
      .mockResolvedValue(undefined),
    refresh: jest.fn(),
    register: jest.fn(),
  }
  const verificationCodeService = { sendRegistrationCode: jest.fn() }
  const jwtService = { verifyAsync: jest.fn() }
  const userService = {
    batchDelete: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findPage: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    nodeEnvironment = 'test'
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
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'NODE_ENV') return nodeEnvironment
              if (key === 'JWT_REFRESH_EXPIRE') return '7d'
              return 'neocrown-test'
            }),
          },
        },
        { provide: UserService, useValue: userService },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('/api')
    app.use(cookieParser())
    const requestContextMiddleware = new RequestContextMiddleware()
    app.use(requestContextMiddleware.use.bind(requestContextMiddleware))
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
      .expect(200)
      .expect(({ body }: { body: { success: boolean } }) => {
        expect(body.success).toBe(false)
      })

    expect(authService.register).not.toHaveBeenCalled()
  })

  it('POST /auth/login 应该规范化邮箱、仅返回访问令牌并设置刷新令牌 Cookie', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('User-Agent', 'neocrown-e2e-agent')
      .send({ email: ' USER@Example.com ', password: 'password123' })
      .expect(200)
      .expect({
        success: true,
        data: {
          accessToken: 'access-token',
        },
        message: ResponseMessageEnum.LOGIN_SUCCESS,
      })
      .expect('set-cookie', /refreshToken=refresh-token/)
      .expect('set-cookie', /Max-Age=604800/)
      .expect('set-cookie', /Path=\/api\/auth/)
      .expect('set-cookie', /HttpOnly/)
      .expect('set-cookie', /SameSite=Strict/)
      .expect(({ headers }: { headers: Record<string, unknown> }) => {
        expect(String(headers['set-cookie'])).not.toContain('Secure')
      })

    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
    const anyString: unknown = expect.any(String)
    const uuid: unknown = expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(authService.notifyLoginSuccess).toHaveBeenCalledWith({
      email: 'user@example.com',
      event: 'user_login',
      ip: anyString,
      message: '用户登录成功',
      requestId: uuid,
      userAgent: 'neocrown-e2e-agent',
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
      .expect(200)
      .expect(({ body }: { body: { success: boolean } }) => {
        expect(body.success).toBe(false)
      })

    expect(authService.login).not.toHaveBeenCalled()
    expect(authService.notifyLoginSuccess).not.toHaveBeenCalled()
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

      expect(authService.notifyLoginSuccess).not.toHaveBeenCalled()
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
    expect(authService.notifyLoginSuccess).not.toHaveBeenCalled()
  })

  it('POST /auth/refresh 应该从 Cookie 刷新、轮换 Cookie 并仅返回访问令牌', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=valid-refresh-token')
      .expect(200)
      .expect({
        success: true,
        data: {
          accessToken: 'new-access-token',
        },
        message: ResponseMessageEnum.REFRESH_TOKEN_SUCCESS,
      })
      .expect('set-cookie', /refreshToken=new-refresh-token/)
      .expect('set-cookie', /Max-Age=604800/)
      .expect('set-cookie', /Path=\/api\/auth/)
      .expect('set-cookie', /HttpOnly/)
      .expect('set-cookie', /SameSite=Strict/)

    expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token')
  })

  it.each([
    ['只有请求体令牌', { refreshToken: 'body-refresh-token' }],
    ['空请求体', {}],
  ])(
    'POST /auth/refresh %s时应该返回 401 并清除 Cookie',
    async (_case, body) => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send(body)
        .expect(401)
        .expect('set-cookie', /refreshToken=;/)
        .expect('set-cookie', /Path=\/api\/auth/)
        .expect(({ body }: { body: Record<string, unknown> }) => {
          expect(body).toMatchObject({
            success: false,
            data: null,
            message: ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
          })
        })

      expect(authService.refresh).not.toHaveBeenCalled()
    },
  )

  it('POST /user/page 参数校验失败时应该返回 HTTP 200 失败响应', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'access' })

    await request(app.getHttpServer())
      .post('/api/user/page')
      .set('Authorization', 'Bearer valid-access-token')
      .send({
        currentPage: '1',
        pageSize: 10,
        rangeDate: [],
      })
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
        })
      })

    expect(userService.findPage).not.toHaveBeenCalled()
  })

  it('POST /auth/refresh 无效令牌应该返回 HTTP 401', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      ),
    )

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=invalid-refresh-token')
      .expect(401)
      .expect('set-cookie', /refreshToken=;/)
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
      .set('Cookie', 'refreshToken=disabled-user-refresh-token')
      .expect(403)
      .expect('set-cookie', /refreshToken=;/)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: ResponseMessageEnum.USER_DISABLED,
        })
      })
  })

  it('POST /auth/logout 应该清除刷新令牌 Cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', 'refreshToken=refresh-token')
      .expect(200)
      .expect('set-cookie', /refreshToken=;/)
      .expect('set-cookie', /Path=\/api\/auth/)
      .expect('set-cookie', /HttpOnly/)
      .expect('set-cookie', /SameSite=Strict/)
      .expect({ success: true, data: null, message: '请求成功' })
  })

  it('生产环境设置 Refresh Token Cookie 时应该启用 Secure', async () => {
    nodeEnvironment = 'production'
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200)
      .expect('set-cookie', /Secure/)
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
