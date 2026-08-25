import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import request from 'supertest'
import { App } from 'supertest/types'
import { AttachController } from '../src/attach/attach.controller'
import { AttachService } from '../src/attach/attach.service'
import type {
  AttachUploadFile,
  AttachUploadResult,
  MergeLargeFileUploadResult,
  VerifyLargeFileUploadResult,
} from '../src/attach/attach.types'
import { AccessTokenGuard } from '../src/auth/guards/access-token.guard'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'

describe('AttachController (e2e)', () => {
  let app: INestApplication<App>
  const attachService = {
    upload: jest.fn<Promise<AttachUploadResult>, [AttachUploadFile]>(),
    verifyLargeFileUpload: jest.fn<
      Promise<VerifyLargeFileUploadResult>,
      [Record<string, unknown>]
    >(),
    uploadLargeFileChunk: jest.fn<
      Promise<void>,
      [AttachUploadFile, Record<string, unknown>]
    >(),
    mergeLargeFileUpload: jest.fn<
      Promise<MergeLargeFileUploadResult>,
      [Record<string, unknown>]
    >(),
  }
  const jwtService = { verifyAsync: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    attachService.upload.mockResolvedValue({
      fileName: 'stored.txt',
      originName: 'origin.txt',
      url: 'http://localhost:8300/public/uploads/stored.txt',
    })
    attachService.verifyLargeFileUpload.mockResolvedValue({
      isExists: false,
      url: '',
      uploadId: 'a'.repeat(64),
      uploadedChunks: [],
    })
    attachService.uploadLargeFileChunk.mockResolvedValue(undefined)
    attachService.mergeLargeFileUpload.mockResolvedValue({
      url: 'http://localhost:8300/public/larges/file.mp4',
      msg: '文件合并成功',
    })
    jwtService.verifyAsync.mockResolvedValue({ sub: 1, type: 'access' })

    const module = await Test.createTestingModule({
      controllers: [AttachController],
      providers: [
        { provide: AttachService, useValue: attachService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('neocrown-test') },
        },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
      ],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('/api')
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        whitelist: true,
      }),
    )
    app.useGlobalInterceptors(new ResponseInterceptor())
    app.useGlobalFilters(new GlobalExceptionFilter())
    await app.init()
  })

  it('should reject an unauthenticated upload', async () => {
    await request(app.getHttpServer()).post('/api/attach/upload').expect(401)
    expect(attachService.upload).not.toHaveBeenCalled()
  })

  it('should accept an authenticated multipart upload', async () => {
    await request(app.getHttpServer())
      .post('/api/attach/upload')
      .set('Authorization', 'Bearer valid-access-token')
      .attach('file', Buffer.from('content'), 'origin.txt')
      .expect(201)
      .expect({
        success: true,
        data: {
          fileName: 'stored.txt',
          originName: 'origin.txt',
          url: 'http://localhost:8300/public/uploads/stored.txt',
        },
        message: '请求成功',
      })

    expect(attachService.upload).toHaveBeenCalledTimes(1)
    const uploadedFile = attachService.upload.mock.calls[0][0]
    expect(uploadedFile.originalname).toBe('origin.txt')
    expect(Buffer.isBuffer(uploadedFile.buffer)).toBe(true)
  })

  it('should return a client error when the file is missing', async () => {
    await request(app.getHttpServer())
      .post('/api/attach/upload')
      .set('Authorization', 'Bearer valid-access-token')
      .expect(200)
      .expect(({ body }: { body: Record<string, unknown> }) => {
        expect(body).toMatchObject({
          success: false,
          data: null,
          message: '必须提供文件',
        })
      })

    expect(attachService.upload).not.toHaveBeenCalled()
  })

  it('should reject unauthenticated large file requests', async () => {
    await request(app.getHttpServer()).post('/api/upload/verify').expect(401)
    await request(app.getHttpServer()).post('/api/upload/merge').expect(401)

    expect(attachService.verifyLargeFileUpload).not.toHaveBeenCalled()
    expect(attachService.mergeLargeFileUpload).not.toHaveBeenCalled()
  })

  it('should expose the authenticated large file upload endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/upload/verify')
      .set('Authorization', 'Bearer valid-access-token')
      .send({
        fileMd5: 'd41d8cd98f00b204e9800998ecf8427e',
        fileName: 'video.mp4',
        fileSize: 10,
      })
      .expect(200)
      .expect({
        success: true,
        data: {
          isExists: false,
          url: '',
          uploadId: 'a'.repeat(64),
          uploadedChunks: [],
        },
        message: '请求成功',
      })

    await request(app.getHttpServer())
      .post('/api/upload/chunk?chunkIndex=0&chunkTotal=1')
      .set('Authorization', 'Bearer valid-access-token')
      .field('uploadId', 'a'.repeat(64))
      .field('fileMd5', 'd41d8cd98f00b204e9800998ecf8427e')
      .field('chunkIndex', '0')
      .field('fileName', 'video.mp4')
      .attach('chunk', Buffer.from('chunk'), 'chunk.part')
      .expect(200)
      .expect({ success: true, data: null, message: '请求成功' })

    await request(app.getHttpServer())
      .post('/api/upload/merge')
      .set('Authorization', 'Bearer valid-access-token')
      .send({
        uploadId: 'a'.repeat(64),
        fileMd5: 'd41d8cd98f00b204e9800998ecf8427e',
        chunkLength: 1,
      })
      .expect(200)
      .expect({
        success: true,
        data: {
          url: 'http://localhost:8300/public/larges/file.mp4',
          msg: '文件合并成功',
        },
        message: '请求成功',
      })

    expect(attachService.verifyLargeFileUpload).toHaveBeenCalledTimes(1)
    expect(attachService.uploadLargeFileChunk).toHaveBeenCalledTimes(1)
    expect(attachService.uploadLargeFileChunk.mock.calls[0][1]).toMatchObject({
      chunkIndex: 0,
      chunkTotal: 1,
    })
    expect(attachService.mergeLargeFileUpload).toHaveBeenCalledTimes(1)
  })

  afterEach(async () => {
    await app.close()
  })
})
