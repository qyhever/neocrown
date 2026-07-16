import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import type { EnvironmentVariables } from './config/environment.validation'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService<EnvironmentVariables, true>)

  app.setGlobalPrefix('/api')
  await app.listen(configService.get('PORT', { infer: true }))
}

bootstrap().catch((err) => {
  console.error('启动失败', err)
  process.exit(1)
})
