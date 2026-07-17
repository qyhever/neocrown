import {
  ClassSerializerInterceptor,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  type NestModule,
} from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { RequestContextMiddleware } from './common/middleware/request-context.middleware'
import { AppConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { LoggerModule } from './logger/logger.module'
import { UserModule } from './user/user.module'

@Module({
  imports: [AppConfigModule, DatabaseModule, LoggerModule, UserModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL })
  }
}
