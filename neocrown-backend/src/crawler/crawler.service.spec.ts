import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { CrawlerService } from './crawler.service'

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}))

const createHotTopicsHtml = (count = 10): string => {
  const topics = Array.from(
    { length: count },
    (_, index) => `
      <div class="cell">
        <span class="item_hot_topic_title">
          <a href="/t/${1000 + index}">热帖标题 ${index + 1}</a>
        </span>
      </div>
    `,
  ).join('')

  return `<html><body><div id="TopicsHot">${topics}</div></body></html>`
}

describe('CrawlerService', () => {
  let service: CrawlerService
  let fetchMock: jest.SpiedFunction<typeof fetch>
  const mkdirMock = jest.mocked(mkdir)
  const readFileMock = jest.mocked(readFile)
  const writeFileMock = jest.mocked(writeFile)

  beforeEach(() => {
    service = new CrawlerService()
    fetchMock = jest.spyOn(globalThis, 'fetch')
    mkdirMock.mockResolvedValue(undefined)
    writeFileMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    fetchMock.mockRestore()
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  it('应该抓取并解析 V2EX 今日热贴 Top 10，并写入 JSON', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-25T00:00:00.000Z'))
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(createHotTopicsHtml(12)),
    } as Response)

    const result = await service.crawlV2exHotTop10()

    expect(result.list).toHaveLength(10)
    expect(result.list[0]).toMatchObject({
      rank: 1,
      id: 1000,
      title: '热帖标题 1',
      url: 'https://v2ex.6688988.xyz/t/1000',
      sourceUrl: 'https://v2ex.6688988.xyz/',
    })
    expect(result.list[9]).toMatchObject({
      rank: 10,
      id: 1009,
      title: '热帖标题 10',
      url: 'https://v2ex.6688988.xyz/t/1009',
      sourceUrl: 'https://v2ex.6688988.xyz/',
    })
    expect(
      result.list.every(
        (topic) => topic.crawledAt === result.list[0].crawledAt,
      ),
    ).toBe(true)
    expect(result.list[0].crawledAt).toBe('2026-07-25 08:00:00')
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.stringMatching(/public\/crawler$/),
      { recursive: true },
    )
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/public\/crawler\/v2ex-hot-top10\.json$/),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    )
  })

  it('应该将相对 URL 转为绝对 URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(`
        <div id="TopicsHot">
          <span class="item_hot_topic_title">
            <a href="/t/12345#reply1">相对链接帖子</a>
          </span>
        </div>
      `),
    } as Response)

    const result = await service.crawlV2exHotTop10()

    expect(result.list).toHaveLength(1)
    expect(result.list[0].id).toBe(12345)
    expect(result.list[0].url).toBe('https://v2ex.6688988.xyz/t/12345#reply1')
  })

  it('读取 JSON 成功时应该直接返回文件内容且不调用 fetch', async () => {
    const result = {
      list: [
        {
          rank: 1,
          id: 1000,
          title: '缓存热帖',
          url: 'https://v2ex.6688988.xyz/t/1000',
          sourceUrl: 'https://v2ex.6688988.xyz/',
          crawledAt: '2026-07-25T10:00:00.000Z',
        },
      ],
    }
    readFileMock.mockResolvedValue(JSON.stringify(result))

    await expect(service.getV2exHotTop10Result()).resolves.toEqual(result)
    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/public\/crawler\/v2ex-hot-top10\.json$/),
      'utf8',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('JSON 文件不存在时应该抛出 404', async () => {
    const error = new Error('not found') as NodeJS.ErrnoException
    error.code = 'ENOENT'
    readFileMock.mockRejectedValue(error)

    await expect(service.getV2exHotTop10Result()).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('远端返回非 2xx 时应该抛出 503', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(''),
    } as Response)

    await expect(service.crawlV2exHotTop10()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })

  it('fetch reject 时应该抛出 503', async () => {
    fetchMock.mockRejectedValue(new Error('network failed'))

    await expect(service.crawlV2exHotTop10()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })

  it('请求超时时应该抛出 503', async () => {
    jest.useFakeTimers()
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        }),
    )

    const promise = service.crawlV2exHotTop10()
    const expectation = expect(promise).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    await jest.advanceTimersByTimeAsync(10_000)

    await expectation
  })

  it('页面结构变化导致解析为空时应该抛出 503', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('<html><body><div id="content"></div></body></html>'),
    } as Response)

    await expect(service.crawlV2exHotTop10()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
