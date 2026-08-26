import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { DataSource } from 'typeorm'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import type { ServiceErrorResult } from '../common/interceptors/response.interceptor'
import type { EnvironmentVariables } from '../config/environment.validation'
import { UserService } from '../user/user.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerificationCodeService } from './verification-code.service'

export interface LoginSuccessNotificationContext {
  email: string
  event: 'user_login'
  ip?: string
  message: string
  requestId: string
  userAgent?: string
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<
    { accessToken: string; refreshToken: string } | ServiceErrorResult
  > {
    const user = await this.userService.findLoginUserByEmail(dto.email)

    if (!user) {
      return {
        error: true,
        message: ResponseMessageEnum.USER_NOT_FOUND,
      }
    }

    if (!user.isEnabled) {
      throw new ForbiddenException(ResponseMessageEnum.USER_DISABLED)
    }

    if (!(await compare(dto.password, user.password))) {
      return {
        error: true,
        message: ResponseMessageEnum.PASSWORD_INCORRECT,
      }
    }

    return this.issueTokens(user.id)
  }

  async notifyLoginSuccess(
    context: LoginSuccessNotificationContext,
  ): Promise<void> {
    try {
      const webhookUrl = new URL(
        this.configService.get('WX_WORK_WEBHOOK_SEND_URL', { infer: true }),
      )
      webhookUrl.searchParams.set(
        'key',
        this.configService.get('WX_WORK_WEBHOOK_SEND_KEY', { infer: true }),
      )

      const content = [
        context.message,
        `邮箱：${context.email}`,
        `事件：${context.event}`,
        `IP：${context.ip ?? '未知'}`,
        `请求 ID：${context.requestId}`,
        `User-Agent：${context.userAgent ?? '未知'}`,
      ].join('\n')

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ msgtype: 'text', text: { content } }),
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        this.logger.error(
          `企业微信登录通知发送失败：HTTP 状态码 ${response.status}`,
        )
        return
      }

      let responseBody: unknown
      try {
        responseBody = await response.json()
      } catch {
        this.logger.error('企业微信登录通知发送失败：响应不是有效 JSON')
        return
      }

      if (
        typeof responseBody !== 'object' ||
        responseBody === null ||
        typeof (responseBody as Record<string, unknown>).errcode !== 'number'
      ) {
        this.logger.error('企业微信登录通知发送失败：响应格式无效')
        return
      }

      const errcode = (responseBody as { errcode: number }).errcode
      if (errcode !== 0) {
        this.logger.error(`企业微信登录通知发送失败：业务错误码 ${errcode}`)
      }
    } catch (error) {
      const errorName =
        error instanceof DOMException || error instanceof Error
          ? error.name
          : undefined
      const isTimeout =
        errorName === 'AbortError' || errorName === 'TimeoutError'
      this.logger.error(
        `企业微信登录通知发送失败：${isTimeout ? '请求超时' : '网络请求异常'}`,
      )
    }
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: unknown

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        issuer: this.configService.get('JWT_ISSUER', { infer: true }),
      })
    } catch {
      throw new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      )
    }

    if (!this.isRefreshTokenPayload(payload)) {
      throw new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      )
    }

    const user = await this.userService.findOne(payload.sub)

    if ('error' in user) {
      throw new UnauthorizedException(
        ResponseMessageEnum.REFRESH_TOKEN_INVALID_OR_EXPIRED,
      )
    }

    if (!user.isEnabled) {
      throw new ForbiddenException(ResponseMessageEnum.USER_DISABLED)
    }

    return this.issueTokens(user.id)
  }

  private async issueTokens(
    userId: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRE', {
      infer: true,
    })
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRE', {
      infer: true,
    })

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, type: 'access', jti: randomUUID() },
        { expiresIn: accessExpiresIn },
      ),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh', jti: randomUUID() },
        { expiresIn: refreshExpiresIn },
      ),
    ])

    return { accessToken, refreshToken }
  }

  private isRefreshTokenPayload(
    payload: unknown,
  ): payload is { sub: number; type: 'refresh' } {
    if (typeof payload !== 'object' || payload === null) return false

    const tokenPayload = payload as Record<string, unknown>

    return (
      tokenPayload.type === 'refresh' &&
      typeof tokenPayload.sub === 'number' &&
      Number.isSafeInteger(tokenPayload.sub) &&
      tokenPayload.sub > 0
    )
  }

  async register(dto: RegisterDto): Promise<null | ServiceErrorResult> {
    const email = this.verificationCodeService.normalizeEmail(dto.email)

    try {
      return await this.dataSource.transaction(async (manager) => {
        const [usernameExists, emailExists] = await Promise.all([
          this.userService.existsByUsername(dto.username, manager),
          this.userService.existsByEmail(email, manager),
        ])
        if (usernameExists) {
          return {
            error: true as const,
            message: ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
          }
        }
        if (emailExists) {
          return {
            error: true as const,
            message: ResponseMessageEnum.EMAIL_ALREADY_EXISTS,
          }
        }

        const verificationCode =
          await this.verificationCodeService.verifyRegistrationCode(
            email,
            dto.verificationCode,
            manager,
          )
        if ('error' in verificationCode) return verificationCode

        await this.userService.createRegistrationUser(
          {
            username: dto.username,
            nickname: dto.nickname,
            email,
            password: dto.password,
          },
          manager,
        )
        await this.verificationCodeService.consume(verificationCode, manager)
        return null
      })
    } catch (error) {
      const databaseError = error as { code?: string; message?: string }
      if (databaseError.code === 'ER_DUP_ENTRY') {
        const isEmail = databaseError.message?.includes('uk_user_email')
        return {
          error: true,
          message: isEmail
            ? ResponseMessageEnum.EMAIL_ALREADY_EXISTS
            : ResponseMessageEnum.USERNAME_ALREADY_EXISTS,
        }
      }
      throw error
    }
  }
}
