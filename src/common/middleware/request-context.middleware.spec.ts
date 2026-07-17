import type { Response } from 'express'
import type { RequestWithContext } from '../types/request-with-context'
import {
  REQUEST_ID_HEADER,
  RequestContextMiddleware,
} from './request-context.middleware'

describe('RequestContextMiddleware', () => {
  it('应该生成请求 ID 并写入响应头', () => {
    const middleware = new RequestContextMiddleware()
    const request = {} as RequestWithContext
    const setHeader = jest.fn()
    const response = {
      setHeader,
    } as unknown as Response
    const next = jest.fn()

    middleware.use(request, response, next)

    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, request.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
