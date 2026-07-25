import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { RefreshTokenDto } from './refresh-token.dto'

describe('RefreshTokenDto', () => {
  it('应该接受非空字符串令牌', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      refreshToken: 'refresh-token',
    })

    await expect(validate(dto)).resolves.toHaveLength(0)
  })

  it.each([undefined, null, '', 123])('应该拒绝非法令牌 %p', async (token) => {
    const dto = plainToInstance(RefreshTokenDto, { refreshToken: token })

    const errors = await validate(dto)
    expect(errors.some((error) => error.property === 'refreshToken')).toBe(true)
  })

  it('应该拒绝额外字段', async () => {
    const dto = plainToInstance(RefreshTokenDto, {
      refreshToken: 'refresh-token',
      unexpected: true,
    })
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })

    expect(errors.some((error) => error.property === 'unexpected')).toBe(true)
  })
})
