import * as Joi from 'joi'

export type NodeEnvironment = 'development' | 'test' | 'production'
export type DatabaseType = 'mysql' | 'postgres'
export type JwtExpiration =
  `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`

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
  JWT_ACCESS_EXPIRE: JwtExpiration
  JWT_REFRESH_EXPIRE: JwtExpiration
  JWT_ISSUER: string
  BCRYPT_ROUNDS: number
  LOG_FILE_ENABLED: boolean
  LOG_DIRNAME: string
  LOG_FILENAME: string
  LOG_DATE_PATTERN: string
  LOG_MAX_SIZE: string
  LOG_MAX_FILES: string
  POSTAL_SMTP_SERVER: string
  POSTAL_SMTP_PORT: number
  POSTAL_SMTP_TIMEOUT_MS: number
  POSTAL_FROM_EMAIL: string
  POSTAL_FROM_PASS: string
  POSTAL_FROM_NAME: string
  EMAIL_VERIFICATION_SECRET: string
  V2EX_HOT_TOP10_MAIL_TO: string
  ATTACH_VIEW_BASE_URL: string
  ATTACH_UPLOAD_DIR_PATH: string
  ATTACH_VIEW_LARGE_FILE_BASE_URL: string
  ATTACH_UPLOAD_LARGE_FILE_PATH: string
  ATTACH_CHUNK_DIR_PATH: string
  ATTACH_CHUNK_DIR_SALT: string
}

export const environmentValidationSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(8300),
  DB_TYPE: Joi.string().valid('mysql', 'postgres').default('mysql'),
  DB_DATABASE: Joi.string().min(1).required(),
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().min(1).required(),
  DB_PASSWORD: Joi.string().min(1).required(),
  DB_SYNC: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().min(1).required(),
  JWT_ACCESS_EXPIRE: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .required(),
  JWT_REFRESH_EXPIRE: Joi.string()
    .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
    .required(),
  JWT_ISSUER: Joi.string().min(1).required(),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(10),
  LOG_FILE_ENABLED: Joi.boolean().default(false),
  LOG_DIRNAME: Joi.string().min(1).required(),
  LOG_FILENAME: Joi.string().min(1).required(),
  LOG_DATE_PATTERN: Joi.string().min(1).required(),
  LOG_MAX_SIZE: Joi.string().min(1).required(),
  LOG_MAX_FILES: Joi.string().min(1).required(),
  POSTAL_SMTP_SERVER: Joi.string().hostname().required(),
  POSTAL_SMTP_PORT: Joi.number().port().default(465),
  POSTAL_SMTP_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000),
  POSTAL_FROM_EMAIL: Joi.string().email().required(),
  POSTAL_FROM_PASS: Joi.string().min(1).required(),
  POSTAL_FROM_NAME: Joi.string().min(1).required(),
  EMAIL_VERIFICATION_SECRET: Joi.string().min(32).required(),
  V2EX_HOT_TOP10_MAIL_TO: Joi.string().email().required(),
  ATTACH_VIEW_BASE_URL: Joi.string().uri({ allowRelative: false }).required(),
  ATTACH_UPLOAD_DIR_PATH: Joi.string().min(1).required(),
  ATTACH_VIEW_LARGE_FILE_BASE_URL: Joi.string()
    .uri({ allowRelative: false })
    .required(),
  ATTACH_UPLOAD_LARGE_FILE_PATH: Joi.string().min(1).required(),
  ATTACH_CHUNK_DIR_PATH: Joi.string().min(1).required(),
  ATTACH_CHUNK_DIR_SALT: Joi.string().min(1).required(),
})
