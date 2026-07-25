import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { LoginDto } from './login.dto'

describe('LoginDto', () => {
  it('应该规范化邮箱并接受合法登录参数', async () => {
    const dto = plainToInstance(LoginDto, {
      email: ' USER@Example.com ',
      password: 'password123',
    })

    await expect(validate(dto)).resolves.toHaveLength(0)
    expect(dto.email).toBe('user@example.com')
  })

  it('应该拒绝非法邮箱', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'invalid-email',
      password: 'password123',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'email')).toBe(true)
  })

  it('应该拒绝空密码', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: '',
    })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'password')).toBe(true)
  })

  it('应该拒绝额外字段', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'user@example.com',
      password: 'password123',
      username: 'unexpected',
    })
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })

    expect(errors.some((error) => error.property === 'username')).toBe(true)
  })
})
