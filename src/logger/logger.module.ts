import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston'
import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { AppConfigModule } from '../config/config.module'
import type {
  EnvironmentVariables,
  NodeEnvironment,
} from '../config/environment.validation'

export const shouldSaveLogToFile = (
  environment: NodeEnvironment,
  logFileEnabled: boolean,
): boolean => environment !== 'development' || logFileEnabled

@Module({
  imports: [
    AppConfigModule,
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => {
        const environment = configService.get('NODE_ENV', { infer: true })
        const logFileEnabled = configService.get('LOG_FILE_ENABLED', {
          infer: true,
        })
        const saveLogToFile = shouldSaveLogToFile(environment, logFileEnabled)

        return {
          level: 'silly',
          transports: [
            new winston.transports.Console({
              format: nestWinstonModuleUtilities.format.nestLike('Neocrown', {
                colors: true,
                prettyPrint: true,
              }),
            }),
            ...(saveLogToFile
              ? [
                  new winston.transports.DailyRotateFile({
                    dirname: configService.get('LOG_DIRNAME', { infer: true }),
                    filename: configService.get('LOG_FILENAME', {
                      infer: true,
                    }),
                    datePattern: configService.get('LOG_DATE_PATTERN', {
                      infer: true,
                    }),
                    maxSize: configService.get('LOG_MAX_SIZE', { infer: true }),
                    maxFiles: configService.get('LOG_MAX_FILES', {
                      infer: true,
                    }),
                    format: winston.format.combine(
                      winston.format.errors({ stack: true }),
                      winston.format.timestamp({
                        format: 'YYYY-MM-DD HH:mm:ss.SSS',
                      }),
                      winston.format.json(),
                    ),
                  }),
                ]
              : []),
          ],
        }
      },
    }),
  ],
})
export class LoggerModule {}
