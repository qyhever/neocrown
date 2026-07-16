import {
  type EnvironmentVariables,
  environmentValidationSchema,
} from './environment.validation'

const requiredEnvironment = {
  DB_DATABASE: 'neocrown',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USERNAME: 'root',
  DB_PASSWORD: 'root123',
  JWT_SECRET: 'testsecret',
  JWT_ACCESS_EXPIRE: '600s',
  JWT_REFRESH_EXPIRE: '72h',
  JWT_ISSUER: 'neocrown',
  LOG_DIRNAME: 'logs',
  LOG_FILENAME: 'application-%DATE%.log',
  LOG_DATE_PATTERN: 'YYYY-MM-DD',
  LOG_MAX_SIZE: '1m',
  LOG_MAX_FILES: '30d',
}

describe('environmentValidationSchema', () => {
  it('should provide defaults and convert PORT to a number', () => {
    const result = environmentValidationSchema.validate({
      ...requiredEnvironment,
      PORT: '8301',
    })
    const value = result.value as EnvironmentVariables

    expect(result.error).toBeUndefined()
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 8301,
      DB_TYPE: 'mysql',
      DB_DATABASE: 'neocrown',
      DB_HOST: '127.0.0.1',
      DB_PORT: 3306,
      DB_USERNAME: 'root',
      DB_PASSWORD: 'root123',
      DB_SYNC: false,
      JWT_SECRET: 'testsecret',
      JWT_ACCESS_EXPIRE: '600s',
      JWT_REFRESH_EXPIRE: '72h',
      JWT_ISSUER: 'neocrown',
      BCRYPT_ROUNDS: 10,
    })
  })

  it('should reject an invalid PORT', () => {
    const { error } = environmentValidationSchema.validate({
      ...requiredEnvironment,
      PORT: 'invalid',
    })

    expect(error).toBeDefined()
  })

  it('should convert database values to their declared types', () => {
    const result = environmentValidationSchema.validate({
      ...requiredEnvironment,
      DB_PORT: '3307',
      DB_SYNC: 'true',
    })
    const value = result.value as EnvironmentVariables

    expect(result.error).toBeUndefined()
    expect(value.DB_PORT).toBe(3307)
    expect(value.DB_SYNC).toBe(true)
  })

  it('should convert BCRYPT_ROUNDS to a number', () => {
    const result = environmentValidationSchema.validate({
      ...requiredEnvironment,
      BCRYPT_ROUNDS: '12',
    })
    const value = result.value as EnvironmentVariables

    expect(result.error).toBeUndefined()
    expect(value.BCRYPT_ROUNDS).toBe(12)
  })

  it.each(['9', '16', 'invalid'])(
    'should reject an invalid BCRYPT_ROUNDS value: %s',
    (bcryptRounds) => {
      const { error } = environmentValidationSchema.validate({
        ...requiredEnvironment,
        BCRYPT_ROUNDS: bcryptRounds,
      })

      expect(error).toBeDefined()
    },
  )
})
