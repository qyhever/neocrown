import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { BatchDeleteUsersDto } from './batch-delete-users.dto'

describe('BatchDeleteUsersDto', () => {
  const validateIds = (ids?: unknown) =>
    validate(plainToInstance(BatchDeleteUsersDto, { ids }))

  it('应该接受由唯一正整数组成的非空数组', async () => {
    await expect(validateIds([1, 2, 3])).resolves.toHaveLength(0)
  })

  it.each([
    ['缺少 ids', undefined],
    ['空数组', []],
    ['重复 ID', [1, 1]],
    ['非整数', [1, 1.5]],
    ['零', [0]],
    ['负整数', [-1]],
    ['非数组', 1],
  ])('应该拒绝%s', async (_case, ids) => {
    const errors = await validateIds(ids)

    expect(errors.some((error) => error.property === 'ids')).toBe(true)
  })
})
