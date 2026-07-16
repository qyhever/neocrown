import { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import { ResponseInterceptor } from './response.interceptor'

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor()
  const createContext = (method: string) =>
    ({
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
})
