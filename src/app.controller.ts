import { Controller, Get } from '@nestjs/common'
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger'
import { AppMetaDto } from './app-meta.dto'
import { AppService } from './app.service'
import { Public } from './common/decorators/public.decorator'
import { SkipResponseWrap } from './common/decorators/skip-response-wrap.decorator'

@ApiTags('应用')
@Controller()
@Public()
@SkipResponseWrap()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '健康检查', description: '返回服务基础可用性信息' })
  @ApiProduces('text/plain')
  @ApiOkResponse({
    description: '服务可用',
    schema: { type: 'string', example: 'success' },
  })
  getHello(): string {
    return this.appService.getHello()
  }

  @Get('meta')
  @ApiOperation({
    summary: '获取构建元信息',
    description: '返回构建脚本写入 public/meta.json 的应用元信息',
  })
  @ApiOkResponse({
    description: '获取构建元信息成功',
    type: AppMetaDto,
  })
  getMeta(): AppMetaDto {
    return this.appService.getMeta()
  }
}
