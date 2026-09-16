import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CookieOptions, Response } from 'express'
import {
  ApiValidationErrorResponse,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { RequestWithContext } from '../common/types/request-with-context'
import type { EnvironmentVariables } from '../config/environment.validation'
import { AuthService } from './auth.service'
import { AuthTokensDto } from './dto/auth-tokens.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { SendRegistrationCodeDto } from './dto/send-registration-code.dto'
import { VerificationCodeService } from './verification-code.service'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)
  private readonly refreshTokenCookieName = 'refreshToken'

  constructor(
    private readonly authService: AuthService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('registration-code')
  @Public()
  @ApiOperation({
    summary: '发送注册验证码',
    description:
      '向指定邮箱发送注册验证码。邮箱已注册、发送过频或邮件发送失败时返回业务失败响应',
  })
  @ApiWrappedCreatedResponse({
    description: '验证码发送请求已处理',
    message: '请求成功',
    data: { type: 'null' },
  })
  @ApiValidationErrorResponse()
  sendRegistrationCode(@Body() dto: SendRegistrationCodeDto) {
    return this.verificationCodeService.sendRegistrationCode(dto.email)
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: '用户注册',
    description:
      '使用邮箱验证码创建新用户。用户名、邮箱重复或验证码错误时返回业务失败响应',
  })
  @ApiWrappedCreatedResponse({
    description: '注册请求已处理',
    message: '请求成功',
    data: { type: 'null' },
  })
  @ApiValidationErrorResponse()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.LOGIN_SUCCESS)
  @ApiOperation({
    summary: '用户登录',
    description:
      '使用邮箱和密码登录。成功后返回访问令牌，并通过 HttpOnly Cookie 设置刷新令牌。用户不存在或密码错误时返回业务失败响应',
  })
  @ApiWrappedOkResponse({
    description: '登录请求已处理',
    message: ResponseMessageEnum.LOGIN_SUCCESS,
    data: { model: AuthTokensDto },
  })
  @ApiValidationErrorResponse()
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto)

    if (!('error' in result)) {
      this.setRefreshTokenCookie(response, result.refreshToken)
      const loginContext = {
        email: dto.email,
        event: 'user_login' as const,
        ip: request.ip,
        message: '用户登录成功',
        requestId: request.requestId,
        userAgent: request.get('user-agent'),
      }

      this.logger.log(loginContext)
      void this.authService.notifyLoginSuccess(loginContext)

      return { accessToken: result.accessToken }
    }

    return result
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.REFRESH_TOKEN_SUCCESS)
  @ApiOperation({
    summary: '刷新令牌',
    description:
      '从 HttpOnly Cookie 读取刷新令牌，轮换 Cookie 并返回新的访问令牌',
  })
  @ApiWrappedOkResponse({
    description: '刷新令牌成功',
    message: ResponseMessageEnum.REFRESH_TOKEN_SUCCESS,
    data: { model: AuthTokensDto },
  })
  @ApiCookieAuth('refreshToken')
  async refresh(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[this.refreshTokenCookieName] as
      string | undefined

    if (!refreshToken) {
      this.clearRefreshTokenCookie(response)
      throw new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      )
    }

    try {
      const tokens = await this.authService.refresh(refreshToken)
      this.setRefreshTokenCookie(response, tokens.refreshToken)
      return { accessToken: tokens.accessToken }
    } catch (error) {
      this.clearRefreshTokenCookie(response)
      throw error
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '退出登录',
    description: '清除浏览器中的 Refresh Token Cookie',
  })
  @ApiWrappedOkResponse({
    description: '退出登录成功',
    message: '请求成功',
    data: { type: 'null' },
  })
  logout(@Res({ passthrough: true }) response: Response): null {
    this.clearRefreshTokenCookie(response)
    return null
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie(this.refreshTokenCookieName, token, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge: this.getRefreshTokenMaxAge(),
    })
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(
      this.refreshTokenCookieName,
      this.getRefreshTokenCookieOptions(),
    )
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure:
        this.configService.get('NODE_ENV', { infer: true }) === 'production',
      path: '/api/auth',
    }
  }

  private getRefreshTokenMaxAge(): number {
    const expiration = this.configService.get('JWT_REFRESH_EXPIRE', {
      infer: true,
    })
    const match = /^(\d+)(ms|s|m|h|d|w|y)$/.exec(expiration)

    if (!match) {
      throw new Error('JWT_REFRESH_EXPIRE 格式无效')
    }

    const unitMilliseconds = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      y: 365.25 * 24 * 60 * 60 * 1000,
    } as const

    return Math.floor(
      Number(match[1]) *
        unitMilliseconds[match[2] as keyof typeof unitMilliseconds],
    )
  }
}
