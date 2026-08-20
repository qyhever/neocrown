import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'
import { QueryFailedError } from 'typeorm'
import type { ApiResponse } from '../interceptors/response.interceptor'
import type { RequestWithContext } from '../types/request-with-context'

type ExceptionCategory =
  | 'authentication'
  | 'authorization'
  | 'conflict'
  | 'database'
  | 'http'
  | 'internal'
  | 'not_found'
  | 'validation'

interface ExceptionLog {
  category: ExceptionCategory
  exception: string
  ip?: string
  message: string
  method: string
  params: Record<string, string | string[]>
  path: string
  query: Record<string, unknown>
  requestId: string
  statusCode: number
  userAgent?: string
  userId?: string | number
}

interface HttpExceptionResponse {
  error?: string
  message?: string | string[]
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<RequestWithContext>()
    const response = http.getResponse<Response>()
    const statusCode = this.getStatusCode(exception)
    const clientMessage = this.getClientMessage(exception, statusCode)
    const log = this.createLog(exception, request, statusCode)

    if (!this.shouldSkipLogging(exception)) {
      if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(log, this.getStack(exception))
      } else {
        this.logger.warn(log)
      }
    }

    if (response.headersSent) return

    const responseStatusCode = this.getResponseStatusCode(statusCode)
    const body: ApiResponse<null> & { requestId: string } = {
      success: false,
      data: null,
      message: clientMessage,
      requestId: request.requestId,
    }
    response.status(responseStatusCode).json(body)
  }

  private createLog(
    exception: unknown,
    request: RequestWithContext,
    statusCode: HttpStatus,
  ): ExceptionLog {
    return {
      category: this.getCategory(exception, statusCode),
      exception:
        exception instanceof Error ? exception.constructor.name : 'Unknown',
      ip: request.ip,
      message: this.getExceptionMessage(exception),
      method: request.method,
      params: request.params,
      path: request.originalUrl,
      query: request.query,
      requestId: request.requestId,
      statusCode,
      userAgent: request.get('user-agent'),
      userId: request.user?.id,
    }
  }

  private getStatusCode(exception: unknown): HttpStatus {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
  }

  private getResponseStatusCode(statusCode: HttpStatus): HttpStatus {
    if (
      statusCode === HttpStatus.BAD_REQUEST ||
      statusCode === HttpStatus.UNPROCESSABLE_ENTITY
    ) {
      return HttpStatus.OK
    }

    return statusCode
  }

  private getCategory(
    exception: unknown,
    statusCode: HttpStatus,
  ): ExceptionCategory {
    if (exception instanceof QueryFailedError) return 'database'

    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'validation'
      case HttpStatus.UNAUTHORIZED:
        return 'authentication'
      case HttpStatus.FORBIDDEN:
        return 'authorization'
      case HttpStatus.NOT_FOUND:
        return 'not_found'
      case HttpStatus.CONFLICT:
        return 'conflict'
      default:
        return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'internal'
          : 'http'
    }
  }

  private getClientMessage(exception: unknown, statusCode: HttpStatus): string {
    if (!(exception instanceof HttpException)) return '服务器内部错误'

    const response = exception.getResponse()
    if (typeof response === 'string') return response

    const { message } = response as HttpExceptionResponse
    if (Array.isArray(message)) return message.join('；')
    if (typeof message === 'string') return message

    return HttpStatus[statusCode] ?? '请求处理失败'
  }

  private getExceptionMessage(exception: unknown): string {
    if (exception instanceof Error) return exception.message
    if (typeof exception === 'string') return exception

    return 'Unknown exception'
  }

  private getStack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined
  }

  private shouldSkipLogging(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'skipLogging' in exception &&
      exception.skipLogging === true
    )
  }
}
