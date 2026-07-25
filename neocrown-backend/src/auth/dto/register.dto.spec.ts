import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { RegisterDto } from './register.dto'

describe('RegisterDto', () => {
  const payload = {
    username: 'new-user',
    nickname: '新用户',
    email: ' USER@Example.com ',
    password: 'password123',
    verificationCode: '123456',
  }

  it('应该规范化邮箱并接受合法注册参数', async () => {
    const dto = plainToInstance(RegisterDto, payload)

    await expect(validate(dto)).resolves.toHaveLength(0)
    expect(dto.email).toBe('user@example.com')
  })

  it('应该拒绝非六位数字验证码', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...payload,
      verificationCode: '12345a',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'verificationCode')).toBe(
      true,
    )
  })

  it('应该拒绝客户端传入 isEnabled', async () => {
    const dto = plainToInstance(RegisterDto, { ...payload, isEnabled: false })
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })

    expect(errors.some((error) => error.property === 'isEnabled')).toBe(true)
  })
})
