import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { environmentValidationSchema } from './environment.validation'

@Global()
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
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
