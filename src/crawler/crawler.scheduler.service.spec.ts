import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants'
import { CrawlerSchedulerService } from './crawler.scheduler.service'
import { CrawlerService } from './crawler.service'

describe('CrawlerSchedulerService', () => {
  let service: CrawlerSchedulerService
  let crawlerService: {
    crawlV2exHotTop10: jest.MockedFunction<CrawlerService['crawlV2exHotTop10']>
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
    service = new CrawlerSchedulerService(crawlerService as CrawlerService)
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
    crawlerService.crawlV2exHotTop10.mockResolvedValue({ list: [] })

    await service.crawlV2exHotTop10Daily()

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(1)
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
