import { instanceToPlain } from 'class-transformer'
import { BaseEntity } from './base.entity'

class TestEntity extends BaseEntity {}

describe('BaseEntity', () => {
  it('should format date fields when serializing a response', () => {
    const entity = new TestEntity()
    entity.createdAt = new Date(2026, 6, 16, 14, 9, 6)
    entity.updatedAt = new Date(2026, 6, 16, 14, 9, 6)

    expect(instanceToPlain(entity)).toMatchObject({
      createdAt: '2026-07-16 14:09:06',
      updatedAt: '2026-07-16 14:09:06',
    })
  })
})
