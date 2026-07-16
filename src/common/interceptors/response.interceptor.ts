import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, map } from 'rxjs'

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
          message: this.getSuccessMessage(),
        }
      }),
    )
  }

  // private getSuccessMessage(context: ExecutionContext): string {
  //   const request = context.switchToHttp().getRequest<{ method?: string }>()

  //   return SUCCESS_MESSAGES[request.method ?? ''] ?? '操作成功'
  // }
  private getSuccessMessage() {
    return '请求成功'
  }
}
