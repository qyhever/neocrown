import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CrawlerService } from './crawler.service'

const V2EX_HOT_TOP10_CRON = '0 8 * * *'
const V2EX_HOT_TOP10_TIME_ZONE = 'Asia/Shanghai'
const MAX_ATTEMPTS = 4

@Injectable()
export class CrawlerSchedulerService {
  private readonly logger = new Logger(CrawlerSchedulerService.name)

  constructor(private readonly crawlerService: CrawlerService) {}

  @Cron(V2EX_HOT_TOP10_CRON, { timeZone: V2EX_HOT_TOP10_TIME_ZONE })
  async crawlV2exHotTop10Daily(): Promise<void> {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.crawlerService.crawlV2exHotTop10()
        this.logger.log(`V2EX 热贴定时抓取成功，尝试次数：${attempt}`)
        return
      } catch (error) {
        lastError = error
        this.logger.warn(
          `V2EX 热贴定时抓取失败，尝试次数：${attempt}/${MAX_ATTEMPTS}`,
          this.getErrorStack(error),
        )
      }
    }

    this.logger.error(
      `V2EX 热贴定时抓取最终失败，总尝试次数：${MAX_ATTEMPTS}`,
      this.getErrorStack(lastError),
    )
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack

    return undefined
  }
}
