import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiValidationErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { SendMailDto } from './dto/send-mail.dto'
import { MailService } from './mail.service'

@ApiTags('邮件')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送纯文本邮件',
    description: '使用系统配置的 SMTP 发件人向指定邮箱发送纯文本邮件',
  })
  @ApiWrappedOkResponse({
    description: '邮件发送请求已处理',
    message: '请求成功',
    data: { type: 'null' },
  })
  @ApiValidationErrorResponse()
  send(@Body() dto: SendMailDto) {
    return this.mailService.sendMail(dto.to, dto.subject, dto.body)
  }
}
