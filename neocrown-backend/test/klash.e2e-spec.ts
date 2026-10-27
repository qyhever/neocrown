import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import type { App } from 'supertest/types'
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard'
import type { GenerateKlashResultDto } from '../src/klash/klash.dto'
import { KlashModule } from '../src/klash/klash.module'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'

const template =
  'proxies:\n  - name: edge1\n    server: old\nproxy-groups:\n  - name: 节点选择\n    proxies:\n      - edge1\n'

describe('Klash generate (e2e)', () => {
  let app: INestApplication<App>
  let directory: string
  let token: string
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'klash-api-'))
    await writeFile(join(directory, 'template.yaml'), template)
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_ISSUER: 'klash-test',
              CLA_CONFIG_TEMPLATE_PATH: join(directory, 'template.yaml'),
              CLA_CONFIG_RESULT_DIR_PATH: join(directory, 'results'),
            }),
          ],
        }),
        KlashModule,
        JwtModule.register({
          secret: 'klash-test-secret',
          signOptions: { issuer: 'klash-test' },
        }),
      ],
      providers: [{ provide: APP_GUARD, useClass: AccessTokenGuard }],
    }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('/api')
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    )
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new GlobalExceptionFilter())
    token = module.get(JwtService).sign({ sub: 1, type: 'access' })
    await app.init()
  })
  afterAll(async () => {
    await app?.close()
    await rm(directory, { recursive: true, force: true })
  })
  const post = () => request(app.getHttpServer()).post('/api/klash/generate')
  it('requires an access token', async () => {
    await post().send({ ips: '::1' }).expect(401)
    await post()
      .set('Authorization', 'Bearer invalid')
      .send({ ips: '::1' })
      .expect(401)
  })
  it.each([
    {},
    { ips: null },
    { ips: 42 },
    { ips: ['::1'] },
    { ips: '' },
    { ips: '\n invalid' },
    { ips: '::1', extra: true },
  ])('validates request: %j', async (body) => {
    const response = await post()
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(400)
    expect(response.body).toMatchObject({ success: false, data: null })
  })
  it('reports original line numbers', async () => {
    const response = await post()
      .set('Authorization', `Bearer ${token}`)
      .send({ ips: '\n::1\ninvalid' })
      .expect(400)
    expect((response.body as { message: string }).message).toContain('第 3 行')
  })
  it('returns wrapped summary and writes the generated file', async () => {
    const response = await post()
      .set('Authorization', `Bearer ${token}`)
      .send({ ips: '::1\n192.0.2.1\n::1' })
      .expect(200)
    const body = response.body as { data: GenerateKlashResultDto }
    expect(body).toEqual({
      success: true,
      message: 'Klash 配置生成成功',
      data: {
        filename: expect.stringMatching(/^\d{8}\.yaml$/) as unknown,
        ipCount: 3,
        sourceNodeCount: 1,
        generatedNodeCount: 3,
      },
    })
    const content = await readFile(
      join(directory, 'results', body.data.filename),
      'utf8',
    )
    expect(content).toContain('server: "::1"')
    expect(content).toContain('server: old')
  })
  it('returns a safe server error for a malformed template', async () => {
    await writeFile(join(directory, 'template.yaml'), 'secret-value: malformed')
    const response = await post()
      .set('Authorization', `Bearer ${token}`)
      .send({ ips: '::1' })
      .expect(500)
    expect(response.body).toMatchObject({
      success: false,
      data: null,
      message: 'Klash 配置模板结构错误，请联系管理员检查节点和代理组',
    })
    expect(JSON.stringify(response.body)).not.toContain('secret-value')
  })
})
