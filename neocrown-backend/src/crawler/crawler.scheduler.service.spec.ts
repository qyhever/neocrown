import { ConfigService } from '@nestjs/config'
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from '../mail/mail.service'
import { CrawlerSchedulerService } from './crawler.scheduler.service'
import { CrawlerService } from './crawler.service'

describe('CrawlerSchedulerService', () => {
  let service: CrawlerSchedulerService
  let crawlerService: {
    crawlV2exHotTop10: jest.MockedFunction<CrawlerService['crawlV2exHotTop10']>
  }
  let mailService: {
    sendV2exHotTop10: jest.MockedFunction<MailService['sendV2exHotTop10']>
  }
  let configService: {
    get: jest.Mock
  }
  let logger: {
    log: jest.Mock
    warn: jest.Mock
    error: jest.Mock
  }

  beforeEach(() => {
    crawlerService = {
      crawlV2exHotTop10: jest.fn(),
    }
    mailService = {
      sendV2exHotTop10: jest.fn().mockResolvedValue(undefined),
    }
    configService = {
      get: jest.fn((key: keyof EnvironmentVariables) => {
        if (key === 'V2EX_HOT_TOP10_MAIL_TO') return 'receiver@example.com'

        return undefined
      }),
    }
    service = new CrawlerSchedulerService(
      crawlerService as CrawlerService,
      mailService as unknown as MailService,
      configService as unknown as ConfigService<EnvironmentVariables, true>,
    )
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    Object.defineProperty(service, 'logger', {
      value: logger,
    })
  })

  it('成功时应该只调用爬虫服务 1 次，并记录成功日志', async () => {
    const list = [
      {
        rank: 1,
        id: 123,
        title: '今日热帖',
        url: 'https://v2ex.example.com/t/123',
        sourceUrl: 'https://v2ex.6688988.xyz/',
        crawledAt: '2026-07-25T00:00:00.000Z',
      },
    ]
    crawlerService.crawlV2exHotTop10.mockResolvedValue({ list })

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(1)
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledTimes(1)
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledWith(
      'receiver@example.com',
      list,
    )
    expect(logger.log).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取成功，尝试次数：1',
    )
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('前几次失败、后续成功时应该重试，并记录最终成功日志', async () => {
    const firstError = new Error('first failed')
    const secondError = new Error('second failed')
    crawlerService.crawlV2exHotTop10
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockResolvedValueOnce({ list: [] })

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(3)
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledTimes(1)
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledWith(
      'receiver@example.com',
      [],
    )
    expect(logger.warn).toHaveBeenNthCalledWith(
      1,
      'V2EX 热贴定时抓取失败，尝试次数：1/4',
      firstError.stack,
    )
    expect(logger.warn).toHaveBeenNthCalledWith(
      2,
      'V2EX 热贴定时抓取失败，尝试次数：2/4',
      secondError.stack,
    )
    expect(logger.log).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取成功，尝试次数：3',
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('邮件发送失败时应该触发重试，并在后续成功时记录成功日志', async () => {
    const firstList = [
      {
        rank: 1,
        id: 123,
        title: '第一次热帖',
        url: 'https://v2ex.example.com/t/123',
        sourceUrl: 'https://v2ex.6688988.xyz/',
        crawledAt: '2026-07-25T00:00:00.000Z',
      },
    ]
    const secondList = [
      {
        rank: 1,
        id: 456,
        title: '第二次热帖',
        url: 'https://v2ex.example.com/t/456',
        sourceUrl: 'https://v2ex.6688988.xyz/',
        crawledAt: '2026-07-25T00:01:00.000Z',
      },
    ]
    const mailError = new Error('mail failed')
    crawlerService.crawlV2exHotTop10
      .mockResolvedValueOnce({ list: firstList })
      .mockResolvedValueOnce({ list: secondList })
    mailService.sendV2exHotTop10
      .mockRejectedValueOnce(mailError)
      .mockResolvedValueOnce(undefined)

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(2)
    expect(mailService.sendV2exHotTop10).toHaveBeenNthCalledWith(
      1,
      'receiver@example.com',
      firstList,
    )
    expect(mailService.sendV2exHotTop10).toHaveBeenNthCalledWith(
      2,
      'receiver@example.com',
      secondList,
    )
    expect(logger.warn).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取失败，尝试次数：1/4',
      mailError.stack,
    )
    expect(logger.log).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取成功，尝试次数：2',
    )
  })

  it('连续失败 4 次时应该停止重试，并记录最终失败日志', async () => {
    const lastError = new Error('last failed')
    crawlerService.crawlV2exHotTop10
      .mockRejectedValueOnce(new Error('first failed'))
      .mockRejectedValueOnce(new Error('second failed'))
      .mockRejectedValueOnce(new Error('third failed'))
      .mockRejectedValueOnce(lastError)

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(4)
    expect(logger.warn).toHaveBeenCalledTimes(4)
    expect(logger.log).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取最终失败，总尝试次数：4',
      lastError.stack,
    )
  })

  it('邮件连续失败 4 次时应该停止重试，并记录最终失败日志', async () => {
    const mailError = new Error('mail failed')
    crawlerService.crawlV2exHotTop10.mockResolvedValue({ list: [] })
    mailService.sendV2exHotTop10.mockRejectedValue(mailError)

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(4)
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledTimes(4)
    expect(logger.warn).toHaveBeenCalledTimes(4)
    expect(logger.log).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      'V2EX 热贴定时抓取最终失败，总尝试次数：4',
      mailError.stack,
    )
  })

  it('应该配置每天 Asia/Shanghai 早上 08:00 执行的 cron metadata', () => {
    const handler = Reflect.get(
      CrawlerSchedulerService.prototype,
      'crawlV2exHotTop10Daily',
    )

    expect(Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, handler)).toMatchObject({
      cronTime: '0 8 * * *',
      timeZone: 'Asia/Shanghai',
    })
  })
})
