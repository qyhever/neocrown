import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiValidationErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { GenerateKlashDto, GenerateKlashResultDto } from './klash.dto'
import { KlashService } from './klash.service'
import { KlashValidationFilter } from './klash-validation.filter'

@ApiTags('Klash 配置')
@ApiBearerAuth()
@Controller('klash')
@UseFilters(KlashValidationFilter)
export class KlashController {
  constructor(private readonly service: KlashService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Klash 配置生成成功')
  @ApiOperation({ summary: '按 IP 批量生成当天的 Klash 配置（同日覆盖）' })
  @ApiWrappedOkResponse({
    description: '生成文件摘要',
    message: 'Klash 配置生成成功',
    data: { model: GenerateKlashResultDto },
  })
  @ApiValidationErrorResponse()
  @ApiAccessTokenErrorResponse()
  @ApiInternalServerErrorResponse({
    description: '模板读取、结构校验或结果写入失败',
  })
  generate(@Body() body: GenerateKlashDto): Promise<GenerateKlashResultDto> {
    return this.service.generate(body.ips)
  }
}
