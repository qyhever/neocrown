import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { CrawlerService } from './crawler.service'
import { V2exHotTop10ResultDto } from './dto/v2ex-hot-top10-result.dto'

@ApiTags('爬虫')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

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
