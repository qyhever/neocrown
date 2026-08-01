import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateProjectDto } from './create-project.dto'

describe('CreateProjectDto', () => {
  const validPayload = {
    name: '2026 社招项目',
    type: '1',
    description: '社招项目',
    effectiveTimeStart: '2026-08-01T00:00:00.000Z',
    effectiveTimeEnd: '2026-12-31T23:59:59.000Z',
    isEnabled: true,
  }

  it('应该接受合法创建项目参数', async () => {
    const errors = await validate(
      plainToInstance(CreateProjectDto, validPayload),
    )

    expect(errors).toHaveLength(0)
  })

  it.each(['name', 'type', 'isEnabled'])(
    '应该拒绝缺少必填字段 %s',
    async (property) => {
      const payload = { ...validPayload }
      delete payload[property as keyof typeof payload]

      const errors = await validate(plainToInstance(CreateProjectDto, payload))

      expect(errors.some((error) => error.property === property)).toBe(true)
    },
  )

  it('应该拒绝非法项目类型', async () => {
    const errors = await validate(
      plainToInstance(CreateProjectDto, {
        ...validPayload,
        type: '3',
      }),
    )

    expect(errors.some((error) => error.property === 'type')).toBe(true)
  })

  it('应该拒绝客户端传入内部字段', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      createdBy: 1,
      updatedBy: 1,
      isSystemDefault: true,
    })
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })

    expect(errors.some((error) => error.property === 'createdBy')).toBe(true)
    expect(errors.some((error) => error.property === 'updatedBy')).toBe(true)
    expect(errors.some((error) => error.property === 'isSystemDefault')).toBe(
      true,
    )
  })
})
