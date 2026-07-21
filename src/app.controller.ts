import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AppService } from './app.service'
import { Public } from './common/decorators/public.decorator'
import { ApiWrappedOkResponse } from './common/decorators/api-wrapped-response.decorator'
import { SkipResponseWrap } from './common/decorators/skip-response-wrap.decorator'

@ApiTags('应用')
@Controller()
@Public()
@SkipResponseWrap()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '健康检查', description: '返回服务基础可用性信息' })
  @ApiWrappedOkResponse({
    description: '服务可用',
    message: '查询成功',
    data: { type: 'string', example: 'Hello World!' },
  })
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('meta')
  @ApiOperation({
    summary: '获取构建元信息',
    description: '返回构建脚本写入 public/meta.json 的应用元信息',
  })
  @ApiWrappedOkResponse({
    description: '获取构建元信息成功',
    message: '查询成功',
    data: {
      type: 'object',
      additionalProperties: true,
      example: { now: '2026-07-17 10:30:00' },
    },
  })
  getMeta(): object {
    return this.appService.getMeta()
  }
}
