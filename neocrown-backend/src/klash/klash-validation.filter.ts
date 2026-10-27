import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'

/** 此接口按契约返回 HTTP 400；其他接口仍沿用全局过滤器的历史行为。 */
@Catch(BadRequestException)
export class KlashValidationFilter implements ExceptionFilter<BadRequestException> {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const body = exception.getResponse() as { message?: string | string[] }
    const message = Array.isArray(body.message)
      ? body.message.join('；')
      : (body.message ?? exception.message)
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(400)
      .json({ success: false, data: null, message })
  }
}
