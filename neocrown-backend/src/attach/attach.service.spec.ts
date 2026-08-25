import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { EnvironmentVariables } from '../config/environment.validation'
import { MAX_ATTACH_FILE_SIZE } from './attach.types'
import { AttachService } from './attach.service'

describe('AttachService', () => {
  let rootDir: string
  let service: AttachService
  let configValues: Record<string, string>

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'neocrown-attach-'))
    configValues = {
      ATTACH_UPLOAD_DIR_PATH: join(rootDir, 'uploads'),
      ATTACH_VIEW_BASE_URL: 'http://localhost:8300/public/uploads/',
      ATTACH_VIEW_LARGE_FILE_BASE_URL: 'http://localhost:8300/public/larges/',
      ATTACH_UPLOAD_LARGE_FILE_PATH: join(rootDir, 'larges'),
      ATTACH_CHUNK_DIR_PATH: join(rootDir, 'chunks'),
      ATTACH_CHUNK_DIR_SALT: 'test-salt',
    }
    const configService = {
      get: jest.fn((key: keyof EnvironmentVariables) => configValues[key]),
    } as unknown as ConfigService<EnvironmentVariables, true>
    service = new AttachService(configService)
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('should create the directory, save the file and return its access information', async () => {
    const result = await service.upload({
      originalname: 'report.pdf',
      buffer: Buffer.from('attachment-content'),
    })

    expect(result.originName).toBe('report.pdf')
    expect(result.fileName).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    expect(result.url).toBe(
      `http://localhost:8300/public/uploads/${result.fileName}`,
    )
    await expect(
      readFile(join(rootDir, 'uploads', result.fileName), 'utf8'),
    ).resolves.toBe('attachment-content')
  })

  it('should reject a missing file', async () => {
    await expect(service.upload(undefined as never)).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('should return a stable upload id and no chunks for a new large file', async () => {
    const file = Buffer.from('large-file-content')
    const fileMd5 = md5(file)

    const result = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })
    const repeated = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })

    expect(result).toEqual({
      isExists: false,
      url: '',
      uploadId: repeated.uploadId,
      uploadedChunks: [],
    })
    expect(result.uploadId).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should recognize an uploaded chunk during preflight', async () => {
    const firstChunk = Buffer.from('first-')
    const secondChunk = Buffer.from('second')
    const file = Buffer.concat([firstChunk, secondChunk])
    const fileMd5 = md5(file)
    const verifyResult = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })

    await service.uploadLargeFileChunk(
      { originalname: 'video.mp4', buffer: secondChunk },
      {
        uploadId: verifyResult.uploadId,
        fileMd5,
        fileName: 'video.mp4',
        chunkIndex: 1,
        chunkTotal: 2,
      },
    )

    await expect(
      service.verifyLargeFileUpload({
        fileMd5,
        fileName: 'video.mp4',
        fileSize: file.length,
      }),
    ).resolves.toMatchObject({ uploadedChunks: [1] })
  })

  it('should merge chunks in order, return the view URL and clean temporary chunks', async () => {
    const chunks = [Buffer.from('first-'), Buffer.from('second')]
    const file = Buffer.concat(chunks)
    const fileMd5 = md5(file)
    const verifyResult = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })

    for (const [chunkIndex, chunk] of chunks.entries()) {
      await service.uploadLargeFileChunk(
        { originalname: 'video.mp4', buffer: chunk },
        {
          uploadId: verifyResult.uploadId,
          fileMd5,
          fileName: 'video.mp4',
          chunkIndex,
          chunkTotal: chunks.length,
        },
      )
    }

    const result = await service.mergeLargeFileUpload({
      uploadId: verifyResult.uploadId,
      fileMd5,
      chunkLength: chunks.length,
    })

    expect(result).toEqual({
      url: `http://localhost:8300/public/larges/${fileMd5}.mp4`,
      msg: '文件合并成功',
    })
    await expect(
      readFile(join(rootDir, 'larges', `${fileMd5}.mp4`)),
    ).resolves.toEqual(file)
    await expect(readdir(join(rootDir, 'chunks'))).resolves.toEqual([])
  })

  it('should support instant upload after a completed merge', async () => {
    const file = Buffer.from('complete-file')
    const fileMd5 = md5(file)
    const verifyResult = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })
    await service.uploadLargeFileChunk(
      { originalname: 'video.mp4', buffer: file },
      {
        uploadId: verifyResult.uploadId,
        fileMd5,
        fileName: 'video.mp4',
        chunkIndex: 0,
        chunkTotal: 1,
      },
    )
    await service.mergeLargeFileUpload({
      uploadId: verifyResult.uploadId,
      fileMd5,
      chunkLength: 1,
    })

    await expect(
      service.verifyLargeFileUpload({
        fileMd5,
        fileName: 'video.mp4',
        fileSize: file.length,
      }),
    ).resolves.toMatchObject({
      isExists: true,
      url: `http://localhost:8300/public/larges/${fileMd5}.mp4`,
    })
  })

  it('should reject invalid chunks, missing chunks and invalid file metadata', async () => {
    const file = Buffer.from('file-content')
    const fileMd5 = md5(file)
    const verifyResult = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: file.length,
    })

    await expect(
      service.uploadLargeFileChunk(
        { originalname: 'video.mp4', buffer: Buffer.from('part') },
        {
          uploadId: verifyResult.uploadId,
          fileMd5,
          fileName: 'video.mp4',
          chunkIndex: 2,
          chunkTotal: 2,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.mergeLargeFileUpload({
        uploadId: verifyResult.uploadId,
        fileMd5,
        chunkLength: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.verifyLargeFileUpload({
        fileMd5: 'not-an-md5',
        fileName: 'video.mp4',
        fileSize: file.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.verifyLargeFileUpload({
        fileMd5,
        fileName: 'video.mov',
        fileSize: file.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.verifyLargeFileUpload({
        fileMd5,
        fileName: 'video.mp4',
        fileSize: MAX_ATTACH_FILE_SIZE + 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('should reject a merged file whose content has the wrong MD5', async () => {
    const fileMd5 = md5(Buffer.from('expected'))
    const verifyResult = await service.verifyLargeFileUpload({
      fileMd5,
      fileName: 'video.mp4',
      fileSize: 7,
    })
    await service.uploadLargeFileChunk(
      { originalname: 'video.mp4', buffer: Buffer.from('wrong!!') },
      {
        uploadId: verifyResult.uploadId,
        fileMd5,
        fileName: 'video.mp4',
        chunkIndex: 0,
        chunkTotal: 1,
      },
    )

    await expect(
      service.mergeLargeFileUpload({
        uploadId: verifyResult.uploadId,
        fileMd5,
        chunkLength: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(readdir(join(rootDir, 'larges'))).resolves.toEqual([])
  })
})

function md5(value: Buffer): string {
  return createHash('md5').update(value).digest('hex')
}
