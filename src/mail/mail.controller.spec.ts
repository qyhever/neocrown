import { HttpStatus, RequestMethod } from '@nestjs/common'
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants'
import { Test, TestingModule } from '@nestjs/testing'
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator'
import { SendMailDto } from './dto/send-mail.dto'
import { MailController } from './mail.controller'
import { MailService } from './mail.service'

describe('MailController', () => {
  let controller: MailController
  let mailService: {
    sendMail: jest.MockedFunction<MailService['sendMail']>
  }

  beforeEach(async () => {
    mailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile()

    controller = module.get<MailController>(MailController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('send 应该将收件人、主题和正文传给 MailService', async () => {
    const dto: SendMailDto = {
      to: 'receiver@example.com',
      subject: '系统通知',
      body: '这是一封测试邮件。',
    }

    await expect(controller.send(dto)).resolves.toBeUndefined()
    expect(mailService.sendMail).toHaveBeenCalledWith(
      dto.to,
      dto.subject,
      dto.body,
    )
  })

  it('send 应该配置 POST /mail/send、HTTP 200，且不跳过鉴权', () => {
    const handler = Reflect.get(MailController.prototype, 'send')

    expect(Reflect.getMetadata(PATH_METADATA, MailController)).toBe('mail')
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('send')
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    )
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK)
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MailController)).toBeUndefined()
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined()
  })
})
