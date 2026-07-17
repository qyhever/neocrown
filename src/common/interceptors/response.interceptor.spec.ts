import { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import { ResponseInterceptor } from './response.interceptor'
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator'

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor()
  const createContext = (
    method: string,
    handler: () => void = () => undefined,
  ) =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ method }),
      }),
    }) as ExecutionContext

  it('应该包装正常返回值', async () => {
    const next: CallHandler = {
      handle: () => of([{ id: 1 }]),
    }

    await expect(
      lastValueFrom(interceptor.intercept(createContext('GET'), next)),
    ).resolves.toEqual({
      success: true,
      data: [{ id: 1 }],
      message: '查询成功',
    })
  })

  it('应该识别 Service 返回的错误标识', async () => {
    const next: CallHandler = {
      handle: () => of({ error: true, message: '重复' }),
    }

    await expect(
      lastValueFrom(interceptor.intercept(createContext('POST'), next)),
    ).resolves.toEqual({
      success: false,
      data: null,
      message: '重复',
    })
  })

  it('应该将空返回值转换为 null', async () => {
    const next: CallHandler = {
      handle: () => of(undefined),
    }

    await expect(
      lastValueFrom(interceptor.intercept(createContext('DELETE'), next)),
    ).resolves.toEqual({
      success: true,
      data: null,
      message: '删除成功',
    })
  })

  it('处理器自定义成功消息应该优先于 HTTP 方法默认消息', async () => {
    const handler = () => undefined
    Reflect.defineMetadata(SUCCESS_MESSAGE_KEY, '删除成功', handler)
    const next: CallHandler = {
      handle: () => of({ deletedIds: [], skipped: [] }),
    }

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext('POST', handler), next),
      ),
    ).resolves.toEqual({
      success: true,
      data: { deletedIds: [], skipped: [] },
      message: '删除成功',
    })
  })
})
