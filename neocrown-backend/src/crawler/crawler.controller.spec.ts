import { ConfigService } from '@nestjs/config'
import { HttpStatus, RequestMethod } from '@nestjs/common'
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from '../mail/mail.service'
import { CrawlerController } from './crawler.controller'
import { CrawlerService } from './crawler.service'

describe('CrawlerController', () => {
  let controller: CrawlerController
  let crawlerService: {
    crawlV2exHotTop10: jest.MockedFunction<CrawlerService['crawlV2exHotTop10']>
    getV2exHotTop10Result: jest.MockedFunction<
      CrawlerService['getV2exHotTop10Result']
    >
  }
  let mailService: {
    sendV2exHotTop10: jest.MockedFunction<MailService['sendV2exHotTop10']>
  }
  let configService: {
    get: jest.Mock
  }

  beforeEach(async () => {
    crawlerService = {
      crawlV2exHotTop10: jest.fn(),
      getV2exHotTop10Result: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrawlerController],
      providers: [
        {
          provide: CrawlerService,
          useValue: crawlerService,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile()

    controller = module.get<CrawlerController>(CrawlerController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('crawlV2exHotTop10 应该调用 CrawlerService 抓取保存方法', async () => {
    const result = {
      list: [
        {
          rank: 1,
          id: 12345,
          title: '热帖标题',
          url: 'https://v2ex.6688988.xyz/t/12345',
          sourceUrl: 'https://v2ex.6688988.xyz/',
          crawledAt: '2026-07-25T10:00:00.000Z',
        },
      ],
    }
    crawlerService.crawlV2exHotTop10.mockResolvedValue(result)

    await expect(controller.crawlV2exHotTop10()).resolves.toBe(result)
    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(1)
  })

  it('crawlAndSendV2exHotTop10Mail 应该抓取保存并发送邮件', async () => {
    const result = {
      list: [
        {
          rank: 1,
          id: 12345,
          title: '热帖标题',
          url: 'https://v2ex.6688988.xyz/t/12345',
          sourceUrl: 'https://v2ex.6688988.xyz/',
          crawledAt: '2026-07-25T10:00:00.000Z',
        },
      ],
    }
    crawlerService.crawlV2exHotTop10.mockResolvedValue(result)

    await expect(controller.crawlAndSendV2exHotTop10Mail()).resolves.toBe(
      result,
    )

    expect(crawlerService.crawlV2exHotTop10).toHaveBeenCalledTimes(1)
    expect(configService.get).toHaveBeenCalledWith('V2EX_HOT_TOP10_MAIL_TO', {
      infer: true,
    })
    expect(mailService.sendV2exHotTop10).toHaveBeenCalledWith(
      'receiver@example.com',
      result.list,
    )
  })

  it('getV2exHotTop10Result 应该调用 CrawlerService 读取 JSON 方法', async () => {
    const result = {
      list: [
        {
          rank: 1,
          id: 12345,
          title: '热帖标题',
          url: 'https://v2ex.6688988.xyz/t/12345',
          sourceUrl: 'https://v2ex.6688988.xyz/',
          crawledAt: '2026-07-25T10:00:00.000Z',
        },
      ],
    }
    crawlerService.getV2exHotTop10Result.mockResolvedValue(result)

    await expect(controller.getV2exHotTop10Result()).resolves.toBe(result)
    expect(crawlerService.getV2exHotTop10Result).toHaveBeenCalledTimes(1)
  })

  it('crawlAndSendV2exHotTop10Mail 应该配置 POST 路由、HTTP 200，且不跳过鉴权', () => {
    const handler = Reflect.get(
      CrawlerController.prototype,
      'crawlAndSendV2exHotTop10Mail',
    )

    expect(Reflect.getMetadata(PATH_METADATA, CrawlerController)).toBe(
      'crawler',
    )
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'v2ex/hot-top10/crawl-and-send-mail',
    )
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    )
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK)
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, CrawlerController),
    ).toBeUndefined()
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined()
  })

  it('crawlV2exHotTop10 应该配置 POST 路由、HTTP 200，且不跳过鉴权', () => {
    const handler = Reflect.get(
      CrawlerController.prototype,
      'crawlV2exHotTop10',
    )

    expect(Reflect.getMetadata(PATH_METADATA, CrawlerController)).toBe(
      'crawler',
    )
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'v2ex/hot-top10/crawl',
    )
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    )
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK)
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, CrawlerController),
    ).toBeUndefined()
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined()
  })

  it('getV2exHotTop10Result 应该配置 GET 路由，且不跳过鉴权', () => {
    const handler = Reflect.get(
      CrawlerController.prototype,
      'getV2exHotTop10Result',
    )

    expect(Reflect.getMetadata(PATH_METADATA, CrawlerController)).toBe(
      'crawler',
    )
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'v2ex/hot-top10/result',
    )
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    )
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, CrawlerController),
    ).toBeUndefined()
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined()
  })
})
