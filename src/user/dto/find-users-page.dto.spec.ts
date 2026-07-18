import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { FindUsersPageDto } from './find-users-page.dto'

describe('FindUsersPageDto', () => {
  it('应该应用默认分页和排序参数', async () => {
    const dto = plainToInstance(FindUsersPageDto, {})
    const errors = await validate(dto)

    expect(errors).toHaveLength(0)
    expect(dto).toMatchObject({
      currentPage: 1,
      pageSize: 10,
      sortField: 'createdAt',
      sortValue: 'desc',
      rangeDate: [],
    })
  })

  it('应该允许 rangeDate 为空数组', async () => {
    const errors = await validate(
      plainToInstance(FindUsersPageDto, { rangeDate: [] }),
    )

    expect(errors).toHaveLength(0)
  })

  it.each([
    [['2026-07-01 00:00:00']],
    [['2026-07-01 00:00:00', '2026-07-31 23:59:59', '2026-08-01 00:00:00']],
    [['2026-07-01', '2026-07-31 23:59:59']],
  ])('应该拒绝非法 rangeDate：%j', async (rangeDate) => {
    const errors = await validate(
      plainToInstance(FindUsersPageDto, { rangeDate }),
    )

    expect(errors.some((error) => error.property === 'rangeDate')).toBe(true)
  })

  it.each([
    ['currentPage', 0],
    ['pageSize', -1],
    ['sortField', 'id'],
    ['sortValue', 'ascending'],
    ['dataType', 'deletedAt'],
  ])('应该拒绝非法字段 %s', async (property, value) => {
    const errors = await validate(
      plainToInstance(FindUsersPageDto, { [property]: value }),
    )

    expect(errors.some((error) => error.property === property)).toBe(true)
  })
})
