import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, map } from 'rxjs'
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator'

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
}

export interface ServiceErrorResult {
  error: true
  message: string
}

function isServiceErrorResult(value: unknown): value is ServiceErrorResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const result = value as Record<string, unknown>

  return result.error === true && typeof result.message === 'string'
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  ApiResponse<unknown>
> {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => {
        if (isServiceErrorResult(data)) {
          return {
            success: false,
            data: null,
            message: data.message,
          }
        }

        return {
          success: true,
          data: data ?? null,
          message: this.getSuccessMessage(context),
        }
      }),
    )
  }

  private getSuccessMessage(context: ExecutionContext): string {
    const customMessage = this.reflector.get<string>(
      SUCCESS_MESSAGE_KEY,
      context.getHandler(),
    )

    return customMessage ?? '请求成功'
  }
}
