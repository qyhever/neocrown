import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import * as cheerio from 'cheerio'
import type {
  V2exHotTopicDto,
  V2exHotTop10ResultDto,
} from './dto/v2ex-hot-top10-result.dto'

const V2EX_SOURCE_URL = 'https://v2ex.6688988.xyz/'
const REQUEST_TIMEOUT_MS = 10_000
const HOT_TOPIC_SELECTOR = '#TopicsHot .item_hot_topic_title a'
const V2EX_HOT_TOP10_RESULT_FILE = join(
  process.cwd(),
  'public',
  'crawler',
  'v2ex-hot-top10.json',
)

@Injectable()
export class CrawlerService {
  async crawlV2exHotTop10(): Promise<V2exHotTop10ResultDto> {
    const html = await this.fetchHomePageHtml()
    const crawledAt = new Date().toISOString()
    const list = this.parseHotTopics(html, crawledAt)

    if (list.length === 0) {
      throw new ServiceUnavailableException('V2EX 热贴解析失败')
    }

    const result = { list }
    await this.writeV2exHotTop10Result(result)

    return result
  }

  async getV2exHotTop10Result(): Promise<V2exHotTop10ResultDto> {
    try {
      const content = await readFile(V2EX_HOT_TOP10_RESULT_FILE, 'utf8')
      return JSON.parse(content) as V2exHotTop10ResultDto
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        throw new NotFoundException('V2EX 热贴结果不存在')
      }

      throw error
    }
  }

  private async writeV2exHotTop10Result(
    result: V2exHotTop10ResultDto,
  ): Promise<void> {
    await mkdir(dirname(V2EX_HOT_TOP10_RESULT_FILE), { recursive: true })
    await writeFile(
      V2EX_HOT_TOP10_RESULT_FILE,
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    )
  }

  private isFileNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
  }

  private async fetchHomePageHtml(): Promise<string> {
    const abortController = new AbortController()
    const timeout = setTimeout(
      () => abortController.abort(),
      REQUEST_TIMEOUT_MS,
    )

    try {
      const response = await fetch(V2EX_SOURCE_URL, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          Referer: V2EX_SOURCE_URL,
          Connection: 'close',
        },
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new ServiceUnavailableException('V2EX 首页请求失败')
      }

      return await response.text()
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      throw new ServiceUnavailableException('V2EX 首页请求失败')
    } finally {
      clearTimeout(timeout)
    }
  }

  private parseHotTopics(html: string, crawledAt: string): V2exHotTopicDto[] {
    const $ = cheerio.load(html)

    return $(HOT_TOPIC_SELECTOR)
      .slice(0, 10)
      .map((index, element) => {
        const anchor = $(element)
        const href = anchor.attr('href')?.trim()
        const title = anchor.text().trim()

        if (!href || !title) return null

        const url = new URL(href, V2EX_SOURCE_URL).toString()
        const id = this.extractTopicId(url)

        if (id === null) return null

        return {
          rank: index + 1,
          id,
          title,
          url,
          sourceUrl: V2EX_SOURCE_URL,
          crawledAt,
        }
      })
      .get()
      .filter((topic): topic is V2exHotTopicDto => topic !== null)
  }

  private extractTopicId(url: string): number | null {
    const { pathname } = new URL(url)
    const match = pathname.match(/^\/t\/(\d+)/)
    if (!match) return null

    const id = Number(match[1])
    return Number.isSafeInteger(id) ? id : null
  }
}
