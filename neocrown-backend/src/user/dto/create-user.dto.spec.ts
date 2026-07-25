import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateUserDto } from './create-user.dto'

describe('CreateUserDto', () => {
  const validPayload = {
    username: 'admin',
    nickname: '管理员',
    email: 'admin@example.com',
    password: 'plain-password',
    isEnabled: true,
  }

  it('应该接受不含 avatar 的合法参数', async () => {
    const errors = await validate(plainToInstance(CreateUserDto, validPayload))

    expect(errors).toHaveLength(0)
  })

  it('应该拒绝字符串类型的 isEnabled', async () => {
    const errors = await validate(
      plainToInstance(CreateUserDto, {
        ...validPayload,
        isEnabled: 'true',
      }),
    )

    expect(errors.some((error) => error.property === 'isEnabled')).toBe(true)
  })

  it.each(['username', 'nickname', 'email', 'password', 'isEnabled'])(
    '应该拒绝缺少必填字段 %s',
    async (property) => {
      const payload = { ...validPayload }
      delete payload[property as keyof typeof payload]

      const errors = await validate(plainToInstance(CreateUserDto, payload))

      expect(errors.some((error) => error.property === property)).toBe(true)
    },
  )
})
