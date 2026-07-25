import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MailService } from '../mail/mail.service'
import { CrawlerService } from './crawler.service'
import { V2exHotTop10ResultDto } from './dto/v2ex-hot-top10-result.dto'

@ApiTags('爬虫')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('crawler')
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('v2ex/hot-top10/crawl')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '抓取并保存 V2EX 今日热贴 Top 10',
    description:
      '低频单次抓取公开首页右侧 Today Top 10，不抓取详情页，并保存到本地 JSON 文件',
  })
  @ApiWrappedOkResponse({
    description: 'V2EX 今日热贴抓取并保存成功',
    message: '请求成功',
    data: { model: V2exHotTop10ResultDto },
  })
  crawlV2exHotTop10() {
    return this.crawlerService.crawlV2exHotTop10()
  }

  @Post('v2ex/hot-top10/crawl-and-send-mail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '抓取 V2EX 今日热贴 Top 10 并发送邮件',
    description:
      '立即抓取公开首页右侧 Today Top 10，保存到本地 JSON 文件，并发送到 V2EX_HOT_TOP10_MAIL_TO',
  })
  @ApiWrappedOkResponse({
    description: 'V2EX 今日热贴抓取保存并发送邮件成功',
    message: '请求成功',
    data: { model: V2exHotTop10ResultDto },
  })
  async crawlAndSendV2exHotTop10Mail() {
    const result = await this.crawlerService.crawlV2exHotTop10()
    const to = this.configService.get('V2EX_HOT_TOP10_MAIL_TO', {
      infer: true,
    })
    await this.mailService.sendV2exHotTop10(to, result.list)

    return result
  }

  @Get('v2ex/hot-top10/result')
  @ApiOperation({
    summary: '读取 V2EX 今日热贴 Top 10 本地结果',
    description: '不访问远端页面，只读取本地 JSON 文件中的最新抓取结果',
  })
  @ApiWrappedOkResponse({
    description: 'V2EX 今日热贴本地结果读取成功',
    message: '请求成功',
    data: { model: V2exHotTop10ResultDto },
  })
  getV2exHotTop10Result() {
    return this.crawlerService.getV2exHotTop10Result()
  }
}
