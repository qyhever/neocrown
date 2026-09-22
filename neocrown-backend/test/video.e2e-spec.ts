import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { App } from 'supertest/types'
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { MAX_VIDEO_SIZE, VideoController } from '../src/video/video.controller'
import { VideoService } from '../src/video/video.service'
import type { VideoProbeResult } from '../src/video/video.types'

describe('VideoController (e2e)', () => {
  let app: INestApplication<App>
  let fixtureDir: string
  const token = { Authorization: 'Bearer valid-access-token' }

  beforeAll(async () => {
    fixtureDir = await mkdtemp(join(tmpdir(), 'neocrown-video-test-'))
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=size=32x24:rate=25:duration=1',
      '-c:v',
      'mpeg4',
      join(fixtureDir, 'silent.mp4'),
    ])
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=size=32x24:rate=25:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=880:duration=1',
      '-map',
      '0:v',
      '-map',
      '1:a',
      '-map',
      '2:a',
      '-c:v',
      'mpeg4',
      '-c:a',
      'aac',
      join(fixtureDir, 'multi.mp4'),
    ])

    const module = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        VideoService,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest
              .fn()
              .mockResolvedValue({ sub: 1, type: 'access' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('neocrown-test') },
        },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
      ],
    }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('/api')
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new GlobalExceptionFilter())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await rm(fixtureDir, { recursive: true, force: true })
  })

  const tempFiles = () =>
    readdir(tmpdir()).then((names) =>
      names.filter((name) => name.startsWith('neocrown-probe-')).sort(),
    )

  it('requires login before accepting a file', async () => {
    await request(app.getHttpServer()).post('/api/video/probe').expect(401)
  })

  it('rejects a missing file', async () => {
    await request(app.getHttpServer())
      .post('/api/video/probe')
      .set(token)
      .expect(200)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('必须提供视频文件'),
      )
  })

  it('extracts a silent video and cleans its temporary file', async () => {
    const before = await tempFiles()
    const response = await request(app.getHttpServer())
      .post('/api/video/probe')
      .set(token)
      .attach(
        'file',
        await readFile(join(fixtureDir, 'silent.mp4')),
        'silent.mp4',
      )
      .expect(200)
    const data = (response.body as { data: VideoProbeResult }).data
    expect(data).toMatchObject({
      fileName: 'silent.mp4',
      format: 'mov,mp4,m4a,3gp,3g2,mj2',
    })
    expect(data.streams).toHaveLength(1)
    expect(data.streams[0]).toMatchObject({
      type: 'video',
      codec: 'mpeg4',
      width: 32,
      height: 24,
      frameRate: '25/1',
    })
    expect(await tempFiles()).toEqual(before)
  })

  it('returns all video and audio streams', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/video/probe')
      .set(token)
      .attach(
        'file',
        await readFile(join(fixtureDir, 'multi.mp4')),
        'multi.mp4',
      )
      .expect(200)
    const data = (response.body as { data: VideoProbeResult }).data
    expect(data.streams.map((stream) => stream.type)).toEqual([
      'video',
      'audio',
      'audio',
    ])
  })

  it('rejects a non-video file and cleans its temporary file', async () => {
    const before = await tempFiles()
    await request(app.getHttpServer())
      .post('/api/video/probe')
      .set(token)
      .attach('file', Buffer.from('not a video'), 'fake.mp4')
      .expect(200)
      .expect(({ body }: { body: { message: string } }) =>
        expect(body.message).toBe('无法解析视频文件'),
      )
    expect(await tempFiles()).toEqual(before)
  })

  it('uses a 500 MiB upload limit', () => {
    expect(MAX_VIDEO_SIZE).toBe(500 * 1024 * 1024)
  })
})
