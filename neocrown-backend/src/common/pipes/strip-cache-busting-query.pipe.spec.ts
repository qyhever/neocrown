import type { ArgumentMetadata } from '@nestjs/common'
import { StripCacheBustingQueryPipe } from './strip-cache-busting-query.pipe'

describe('StripCacheBustingQueryPipe', () => {
  it('应该从 query 参数中移除缓存规避字段 t', () => {
    const pipe = new StripCacheBustingQueryPipe()
    const metadata = { type: 'query' } as ArgumentMetadata

    expect(
      pipe.transform(
        {
          page: '1',
          pageSize: '50',
          t: '1786285990855',
        },
        metadata,
      ),
    ).toEqual({
      page: '1',
      pageSize: '50',
    })
  })

  it('不应该处理非 query 参数', () => {
    const pipe = new StripCacheBustingQueryPipe()
    const value = { content: 'text', t: '1786285990855' }
    const metadata = { type: 'body' } as ArgumentMetadata

    expect(pipe.transform(value, metadata)).toBe(value)
  })
})
