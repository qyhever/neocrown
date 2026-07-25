import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { SendMailDto } from './send-mail.dto'

describe('SendMailDto', () => {
  const payload = {
    to: ' USER@Example.com ',
    subject: '系统通知',
    body: '这是一封测试邮件。',
  }

  it('应该规范化邮箱并接受合法发送邮件参数', async () => {
    const dto = plainToInstance(SendMailDto, payload)

    await expect(validate(dto)).resolves.toHaveLength(0)
    expect(dto.to).toBe('user@example.com')
  })

  it('应该拒绝非法邮箱', async () => {
    const dto = plainToInstance(SendMailDto, {
      ...payload,
      to: 'invalid-email',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'to')).toBe(true)
  })

  it('应该拒绝空主题', async () => {
    const dto = plainToInstance(SendMailDto, {
      ...payload,
      subject: '',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'subject')).toBe(true)
  })

  it('应该拒绝空正文', async () => {
    const dto = plainToInstance(SendMailDto, {
      ...payload,
      body: '',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'body')).toBe(true)
  })
})
