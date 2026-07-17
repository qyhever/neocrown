import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { Response } from 'express'
import { randomUUID } from 'node:crypto'
import type { RequestWithContext } from '../types/request-with-context'

export const REQUEST_ID_HEADER = 'X-Request-Id'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: () => void): void {
    const requestId = randomUUID()

    request.requestId = requestId
    response.setHeader(REQUEST_ID_HEADER, requestId)
    next()
  }
}
