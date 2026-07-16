import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import {
  type EnvironmentVariables,
  environmentValidationSchema,
} from './config/environment.validation'
import { UserModule } from './user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
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

        return {
          type,
          host,
          port,
          username,
          password,
          database,
          synchronize,
          autoLoadEntities: true,
          // logging: ["error", "warn"], // 日志级别
          logging: process.env.NODE_ENV === 'development', // 日志
        }
      },
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
