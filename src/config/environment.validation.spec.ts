import {
  type EnvironmentVariables,
  environmentValidationSchema,
} from './environment.validation'

describe('environmentValidationSchema', () => {
  it('should provide defaults and convert PORT to a number', () => {
    const result = environmentValidationSchema.validate({
      PORT: '8301',
    })
    const value = result.value as EnvironmentVariables

    expect(result.error).toBeUndefined()
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 8301,
      DB_TYPE: 'mysql',
      DB_DATABASE: 'r3',
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_USERNAME: 'root',
      DB_PASSWORD: 'root123',
      DB_SYNC: false,
      JWT_SECRET: 'testsecret',
      JWT_ACCESS_EXPIRE: '600s',
      JWT_REFRESH_EXPIRE: '72h',
      JWT_ISSUER: 'neocrown',
    })
  })

  it('should reject an invalid PORT', () => {
    const { error } = environmentValidationSchema.validate({
      PORT: 'invalid',
    })

    expect(error).toBeDefined()
  })

  it('should convert database values to their declared types', () => {
    const result = environmentValidationSchema.validate({
      DB_PORT: '3307',
      DB_SYNC: 'true',
    })
    const value = result.value as EnvironmentVariables

    expect(result.error).toBeUndefined()
    expect(value.DB_PORT).toBe(3307)
    expect(value.DB_SYNC).toBe(true)
  })
})
