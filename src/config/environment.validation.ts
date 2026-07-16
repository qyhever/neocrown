import * as Joi from 'joi'

export type NodeEnvironment = 'development' | 'test' | 'production'
export type DatabaseType = 'mysql'

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment
  PORT: number
  DB_TYPE: DatabaseType
  DB_DATABASE: string
  DB_HOST: string
  DB_PORT: number
  DB_USERNAME: string
  DB_PASSWORD: string
  DB_SYNC: boolean
  JWT_SECRET: string
  JWT_ACCESS_EXPIRE: string
  JWT_REFRESH_EXPIRE: string
  JWT_ISSUER: string
}

export const environmentValidationSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(8300),
  DB_TYPE: Joi.string().valid('mysql').default('mysql'),
  DB_DATABASE: Joi.string().min(1).default('r3'),
  DB_HOST: Joi.string().hostname().default('127.0.0.1'),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().min(1).default('root'),
  DB_PASSWORD: Joi.string().min(1).default('root123'),
  DB_SYNC: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().min(1).default('testsecret'),
  JWT_ACCESS_EXPIRE: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('600s'),
  JWT_REFRESH_EXPIRE: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .default('72h'),
  JWT_ISSUER: Joi.string().min(1).default('neocrown'),
})
