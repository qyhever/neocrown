import { BadRequestException, type ArgumentsHost, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { QueryFailedError } from 'typeorm'
import type { RequestWithContext } from '../types/request-with-context'
import { GlobalExceptionFilter } from './global-exception.filter'

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter
  let request: RequestWithContext
  let response: {
    headersSent: boolean
    json: jest.Mock
    status: jest.Mock
  }
  let host: ArgumentsHost
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    filter = new GlobalExceptionFilter()
    request = {
      get: jest.fn().mockReturnValue('jest-agent'),
      ip: '127.0.0.1',
      method: 'POST',
      originalUrl: '/api/auth/register?source=test',
      params: { id: '1' },
      query: { source: 'test' },
      requestId: 'request-id',
      user: { id: 7 },
    } as unknown as RequestWithContext
    response = {
      headersSent: false,
      json: jest.fn(),
      status: jest.fn(),
    }
    response.status.mockReturnValue(response)
    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response as unknown as Response,
      }),
    } as ArgumentsHost
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('应该将参数校验异常记录为 validation 警告', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'password is too short'],
    })

    filter.catch(exception, host)

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'validation',
        exception: 'BadRequestException',
        method: 'POST',
        path: '/api/auth/register?source=test',
        requestId: 'request-id',
        statusCode: 400,
        userId: 7,
      }),
    )
    expect(errorSpy).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      message: 'email must be an email；password is too short',
      requestId: 'request-id',
    })
  })

  it('应该记录未知异常堆栈并返回安全消息', () => {
    const exception = new Error('Unexpected failure')

    filter.catch(exception, host)

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'internal',
        exception: 'Error',
        message: 'Unexpected failure',
        requestId: 'request-id',
        statusCode: 500,
      }),
      exception.stack,
    )
    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      data: null,
      message: '服务器内部错误',
      requestId: 'request-id',
    })
  })

  it('应该将查询失败异常分类为 database', () => {
    const exception = new QueryFailedError(
      'SELECT 1',
      [],
      new Error('Database unavailable'),
    )

    filter.catch(exception, host)

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'database',
        exception: 'QueryFailedError',
        statusCode: 500,
      }),
      exception.stack,
    )
  })
})
