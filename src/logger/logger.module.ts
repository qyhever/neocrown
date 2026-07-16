import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston'
import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { AppConfigModule } from '../config/config.module'
import type { EnvironmentVariables } from '../config/environment.validation'

@Module({
  imports: [
    AppConfigModule,
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        level: 'silly',
        transports: [
          new winston.transports.Console({
            format: nestWinstonModuleUtilities.format.nestLike('Neocrown', {
              colors: true,
              prettyPrint: true,
            }),
          }),
          new winston.transports.DailyRotateFile({
            dirname: configService.get('LOG_DIRNAME', { infer: true }),
            filename: configService.get('LOG_FILENAME', { infer: true }),
            datePattern: configService.get('LOG_DATE_PATTERN', { infer: true }),
            maxSize: configService.get('LOG_MAX_SIZE', { infer: true }),
            maxFiles: configService.get('LOG_MAX_FILES', { infer: true }),
            format: winston.format.combine(
              winston.format.errors({ stack: true }),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              winston.format.printf(
                ({ context, level, message, stack, timestamp }) => {
                  const logContext = context ? ` [${context as string}]` : ''
                  const errorStack = stack ? `\n${stack as string}` : ''

                  return `${String(timestamp)} ${level}${logContext}: ${String(message)}${errorStack}`
                },
              ),
            ),
          }),
        ],
      }),
    }),
  ],
})
export class LoggerModule {}
