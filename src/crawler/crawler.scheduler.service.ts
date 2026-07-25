import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from '../mail/mail.service'
import { CrawlerService } from './crawler.service'

const V2EX_HOT_TOP10_CRON = '0 8 * * *'
const V2EX_HOT_TOP10_TIME_ZONE = 'Asia/Shanghai'
const MAX_ATTEMPTS = 4

@Injectable()
export class CrawlerSchedulerService {
  private readonly logger = new Logger(CrawlerSchedulerService.name)

  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Cron(V2EX_HOT_TOP10_CRON, { timeZone: V2EX_HOT_TOP10_TIME_ZONE })
  async crawlV2exHotTop10Daily(): Promise<void> {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const result = await this.crawlerService.crawlV2exHotTop10()
        const to = this.configService.get('V2EX_HOT_TOP10_MAIL_TO', {
          infer: true,
        })
        await this.mailService.sendV2exHotTop10(to, result.list)
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
