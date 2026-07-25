import { Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { AppConfigModule } from '../config/config.module'
import type { EnvironmentVariables } from '../config/environment.validation'

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ): TypeOrmModuleOptions => {
        const type = configService.get('DB_TYPE', { infer: true })
        const host = configService.get('DB_HOST', { infer: true })
        const port = configService.get('DB_PORT', { infer: true })
        const username = configService.get('DB_USERNAME', { infer: true })
        const password = configService.get('DB_PASSWORD', { infer: true })
        const database = configService.get('DB_DATABASE', { infer: true })
        const synchronize = configService.get('DB_SYNC', { infer: true })
        const environment = configService.get('NODE_ENV', { infer: true })

        return {
          type,
          host,
          port,
          username,
          password,
          database,
          synchronize,
          autoLoadEntities: true,
          retryAttempts: 3,
          retryDelay: 3000,
          verboseRetryLog: true,
          logging: environment === 'development',
        }
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM 数据库配置不存在')
        }

        const dataSource = new DataSource(options)

        try {
          await dataSource.initialize()
          Logger.log('数据库连接成功', 'TypeORM')
          return dataSource
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const stack = error instanceof Error ? error.stack : undefined

          Logger.error(`数据库连接失败：${message}`, stack, 'TypeORM')
          throw error
        }
      },
    }),
  ],
})
export class DatabaseModule {}
