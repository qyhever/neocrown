import {
  Controller,
  ExecutionContext,
  Get,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { ResponseMessageEnum } from '../../common/enums/response-message.enum'
import type { RequestWithContext } from '../../common/types/request-with-context'
import type { EnvironmentVariables } from '../../config/environment.validation'
import { AccessTokenGuard } from './access-token.guard'

@Controller('public-controller')
@Public()
class PublicController {
  @Get()
  findAll(this: void) {}
}

@Controller('mixed-controller')
class MixedController {
  @Get('public')
  @Public()
  publicRoute(this: void) {}

  @Get('protected')
  protectedRoute(this: void) {}
}

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard
  let jwtService: { verifyAsync: jest.Mock }
  let request: Pick<Request, 'headers'> & Partial<RequestWithContext>

  const createContext = (
    controller: object = MixedController,
    handler: (...args: never[]) => unknown = MixedController.prototype
      .protectedRoute,
  ): ExecutionContext =>
    ({
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() }
    request = { headers: {} }
    guard = new AccessTokenGuard(
      new Reflector(),
      jwtService as unknown as JwtService,
      {
        get: jest.fn().mockReturnValue('neocrown-test'),
      } as unknown as ConfigService<EnvironmentVariables, true>,
    )
  })

  it('应该允许控制器级公开路由无令牌访问', async () => {
    await expect(
      guard.canActivate(
        createContext(PublicController, PublicController.prototype.findAll),
      ),
    ).resolves.toBe(true)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
  })

  it('应该允许方法级公开路由无令牌访问', async () => {
    await expect(
      guard.canActivate(
        createContext(MixedController, MixedController.prototype.publicRoute),
      ),
    ).resolves.toBe(true)
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
  })

  it('应该验证 access token 并写入 request.user.id', async () => {
    request.headers.authorization = 'Bearer valid-access-token'
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, type: 'access' })

    await expect(guard.canActivate(createContext())).resolves.toBe(true)

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-access-token', {
      issuer: 'neocrown-test',
    })
    expect(request.user).toEqual({ id: 7 })
  })

  it.each([
    ['缺少请求头', undefined],
    ['缺少令牌', 'Bearer'],
    ['令牌为空', 'Bearer '],
    ['认证方案错误', 'Basic token'],
    ['认证方案大小写错误', 'bearer token'],
    ['前置空格', ' Bearer token'],
    ['多余空格', 'Bearer  token'],
    ['多个令牌', 'Bearer token another-token'],
  ])('应该拒绝%s', async (_case, authorization) => {
    request.headers.authorization = authorization

    await expect(guard.canActivate(createContext())).rejects.toMatchObject({
      status: 401,
      message: ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
    })
    expect(jwtService.verifyAsync).not.toHaveBeenCalled()
  })

  it.each(['令牌已过期', '签名无效', 'issuer 不符'])(
    '应该统一拒绝%s',
    async () => {
      request.headers.authorization = 'Bearer invalid-access-token'
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt verification'))

      await expect(guard.canActivate(createContext())).rejects.toEqual(
        new UnauthorizedException(
          ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
        ),
      )
    },
  )

  it.each([
    ['refresh token', { sub: 7, type: 'refresh' }],
    ['payload 为 null', null],
    ['缺少 type', { sub: 7 }],
    ['缺少 sub', { type: 'access' }],
    ['sub 为字符串', { sub: '7', type: 'access' }],
    ['sub 为零', { sub: 0, type: 'access' }],
    ['sub 为负数', { sub: -1, type: 'access' }],
    ['sub 为小数', { sub: 1.5, type: 'access' }],
    [
      'sub 超出安全整数范围',
      {
        sub: Number.MAX_SAFE_INTEGER + 1,
        type: 'access',
      },
    ],
  ])('应该拒绝%s', async (_case, payload) => {
    request.headers.authorization = 'Bearer invalid-payload-token'
    jwtService.verifyAsync.mockResolvedValue(payload)

    await expect(guard.canActivate(createContext())).rejects.toMatchObject({
      status: 401,
      message: ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
    })
    expect(request.user).toBeUndefined()
  })
})
