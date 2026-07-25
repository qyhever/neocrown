import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory, type NestApplication } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { knife4jSetup } from 'nestjs-knife4j-plus'
import { join } from 'node:path'
import { AppModule } from './app.module'
import type { EnvironmentVariables } from './config/environment.validation'

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    bufferLogs: true,
  })
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  const configService = app.get(ConfigService<EnvironmentVariables, true>)

  app.useStaticAssets(join(process.cwd(), 'public'))
  app.setGlobalPrefix('/api')
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      whitelist: true,
    }),
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Neocrown API')
    .setDescription('Neocrown backend API documentation')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('/api/docs', app, document)
  // /api/k4/doc.html
  await knife4jSetup(
    app,
    [
      {
        name: 'Neocrown API',
        url: '../docs-json',
      },
    ],
    '/api/k4',
  )

  await app.listen(configService.get('PORT', { infer: true }))
}

bootstrap().catch((err) => {
  console.error('启动失败', err)
  process.exit(1)
})
