import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { UpdateUserDto } from './update-user.dto'

describe('UpdateUserDto', () => {
  it('应该接受包含数字 ID 的合法部分更新', async () => {
    const errors = await validate(
      plainToInstance(UpdateUserDto, {
        id: 1,
        nickname: '新昵称',
        email: 'new@example.com',
      }),
    )

    expect(errors).toHaveLength(0)
  })

  it('应该接受只有 ID 的请求', async () => {
    const errors = await validate(plainToInstance(UpdateUserDto, { id: 1 }))

    expect(errors).toHaveLength(0)
  })

  it.each([
    ['缺少 ID', { nickname: '新昵称' }, 'id'],
    ['字符串 ID', { id: '1' }, 'id'],
    ['错误的字段类型', { id: 1, isEnabled: 'true' }, 'isEnabled'],
  ])('应该拒绝%s', async (_description, payload, property) => {
    const errors = await validate(plainToInstance(UpdateUserDto, payload))

    expect(errors.some((error) => error.property === property)).toBe(true)
  })
})
