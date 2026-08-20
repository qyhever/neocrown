import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'
import { ResponseMessageEnum } from '../../common/enums/response-message.enum'
import type { RequestWithContext } from '../../common/types/request-with-context'
import type { EnvironmentVariables } from '../../config/environment.validation'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<RequestWithContext>()
    const token = this.extractBearerToken(request.headers.authorization)

    if (!token) this.throwUnauthorized(true)

    let payload: unknown
    try {
      payload = await this.jwtService.verifyAsync(token, {
        issuer: this.configService.get('JWT_ISSUER', { infer: true }),
      })
    } catch {
      this.throwUnauthorized(true)
    }

    if (!this.isAccessTokenPayload(payload)) this.throwUnauthorized(true)

    request.user = { id: payload.sub }
    return true
  }

  private extractBearerToken(
    authorization: string | undefined,
  ): string | undefined {
    const match = authorization?.match(/^Bearer ([^\s]+)$/)
    return match?.[1]
  }

  private isAccessTokenPayload(
    payload: unknown,
  ): payload is { sub: number; type: 'access' } {
    if (typeof payload !== 'object' || payload === null) return false

    const tokenPayload = payload as Record<string, unknown>

    return (
      tokenPayload.type === 'access' &&
      typeof tokenPayload.sub === 'number' &&
      Number.isSafeInteger(tokenPayload.sub) &&
      tokenPayload.sub > 0
    )
  }

  private throwUnauthorized(skipLogging = false): never {
    throw Object.assign(
      new UnauthorizedException(
        ResponseMessageEnum.ACCESS_TOKEN_INVALID_OR_EXPIRED,
      ),
      { skipLogging },
    )
  }
}
