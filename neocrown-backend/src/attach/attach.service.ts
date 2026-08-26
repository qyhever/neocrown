import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { basename, extname, join } from 'node:path'
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, type Dirent } from 'node:fs'
import type { EnvironmentVariables } from '../config/environment.validation'
import {
  MAX_ATTACH_FILE_SIZE,
  type AttachUploadFile,
  type AttachUploadResult,
  type LargeFileChunkUploadRequest,
  type MergeLargeFileUploadResult,
  type VerifyLargeFileUploadResult,
} from './attach.types'
import type {
  MergeLargeFileUploadDto,
  VerifyLargeFileUploadDto,
} from './dto/large-file-upload.dto'

interface UploadMetadata {
  fileName: string
  fileSize?: number
  chunkTotal: number
}

const MD5_PATTERN = /^[a-f0-9]{32}$/i
const UPLOAD_ID_PATTERN = /^[a-f0-9]{64}$/i
const METADATA_FILE_NAME = '.upload.json'
const MERGED_FILE_DELETE_DELAY_MS = 10 * 60 * 1000

@Injectable()
export class AttachService {
  private readonly logger = new Logger(AttachService.name)

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async upload(file: AttachUploadFile): Promise<AttachUploadResult> {
    if (!file) {
      throw new BadRequestException('必须提供文件')
    }

    const fileName = `${randomUUID()}${extname(file.originalname)}`
    const uploadDir = this.configService.get('ATTACH_UPLOAD_DIR_PATH', {
      infer: true,
    })
    const filePath = join(uploadDir, fileName)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, file.buffer)

    const viewBaseUrl = this.configService.get('ATTACH_VIEW_BASE_URL', {
      infer: true,
    })

    return {
      fileName,
      originName: file.originalname,
      url: `${viewBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(fileName)}`,
    }
  }

  async verifyLargeFileUpload(
    dto: VerifyLargeFileUploadDto,
  ): Promise<VerifyLargeFileUploadResult> {
    this.validateMd5(dto.fileMd5)
    this.validateMp4FileName(dto.fileName)
    this.validateFileSize(dto.fileSize)

    const uploadId = this.createUploadId(dto.fileMd5)
    const uploadPath = this.getLargeFilePath(dto.fileMd5)
    const viewBaseUrl = this.getConfig('ATTACH_VIEW_LARGE_FILE_BASE_URL')
    const url = this.createViewUrl(viewBaseUrl, uploadPath.fileName)

    if (await this.isRegularFile(uploadPath.path)) {
      return {
        isExists: true,
        url,
        uploadId,
        uploadedChunks: [],
      }
    }

    await mkdir(uploadPath.chunkDirectory, { recursive: true })
    await this.createOrValidateMetadata(uploadPath.metadataPath, {
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      chunkTotal: 0,
    })

    return {
      isExists: false,
      url: '',
      uploadId,
      uploadedChunks: await this.listUploadedChunks(uploadPath.chunkDirectory),
    }
  }

  async uploadLargeFileChunk(
    file: AttachUploadFile,
    request: LargeFileChunkUploadRequest,
  ): Promise<void> {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('必须提供分片文件')
    }

    this.validateMd5(request.fileMd5)
    this.validateUploadId(request.uploadId, request.fileMd5)
    this.validateMp4FileName(request.fileName)
    const chunkIndex = this.validateInteger(request.chunkIndex, 'chunkIndex', 0)
    const chunkTotal = this.validateInteger(request.chunkTotal, 'chunkTotal', 1)

    if (chunkIndex >= chunkTotal) {
      throw new BadRequestException('chunkIndex 不能超出分片总数')
    }
    if (file.buffer.length > MAX_ATTACH_FILE_SIZE) {
      throw new BadRequestException('分片大小超过限制')
    }

    const uploadPath = this.getLargeFilePath(request.fileMd5)
    await mkdir(uploadPath.chunkDirectory, { recursive: true })
    const metadata = await this.readMetadata(uploadPath.metadataPath)

    if (metadata) {
      if (metadata.fileName !== request.fileName) {
        throw new BadRequestException('文件名与预检信息不一致')
      }
      if (metadata.chunkTotal !== 0 && metadata.chunkTotal !== chunkTotal) {
        throw new BadRequestException('分片总数与已有上传不一致')
      }
    }

    await this.createOrValidateMetadata(uploadPath.metadataPath, {
      fileName: request.fileName,
      chunkTotal,
      ...(metadata?.fileSize === undefined
        ? {}
        : { fileSize: metadata.fileSize }),
    })

    const chunkPath = join(uploadPath.chunkDirectory, `${chunkIndex}.part`)
    const temporaryPath = join(
      uploadPath.chunkDirectory,
      `.${chunkIndex}.${randomUUID()}.part`,
    )

    try {
      await writeFile(temporaryPath, file.buffer, { flag: 'wx' })
      await rename(temporaryPath, chunkPath)
    } finally {
      await rm(temporaryPath, { force: true })
    }
  }

  async mergeLargeFileUpload(
    dto: MergeLargeFileUploadDto,
  ): Promise<MergeLargeFileUploadResult> {
    this.validateMd5(dto.fileMd5)
    this.validateUploadId(dto.uploadId, dto.fileMd5)
    const chunkLength = this.validateInteger(dto.chunkLength, 'chunkLength', 1)
    const uploadPath = this.getLargeFilePath(dto.fileMd5)
    const viewBaseUrl = this.getConfig('ATTACH_VIEW_LARGE_FILE_BASE_URL')
    const url = this.createViewUrl(viewBaseUrl, uploadPath.fileName)

    if (await this.isRegularFile(uploadPath.path)) {
      return { url, msg: '文件已存在，已完成秒传' }
    }

    const metadata = await this.readMetadata(uploadPath.metadataPath)
    if (!metadata) {
      throw new BadRequestException('未找到分片上传记录')
    }
    if (metadata.chunkTotal !== 0 && metadata.chunkTotal !== chunkLength) {
      throw new BadRequestException('分片总数与上传记录不一致')
    }

    const chunkPaths = Array.from({ length: chunkLength }, (_, index) =>
      join(uploadPath.chunkDirectory, `${index}.part`),
    )
    const chunkSizes: number[] = []
    for (const chunkPath of chunkPaths) {
      const chunkStat = await this.getRegularFileStat(chunkPath)
      if (!chunkStat) {
        throw new BadRequestException('分片不完整，无法合并')
      }
      chunkSizes.push(chunkStat.size)
    }

    const totalSize = chunkSizes.reduce((total, size) => total + size, 0)
    if (totalSize > MAX_ATTACH_FILE_SIZE) {
      throw new BadRequestException('文件大小超过 10GB 限制')
    }
    if (metadata.fileSize !== undefined && metadata.fileSize !== totalSize) {
      throw new BadRequestException('分片内容大小与文件大小不一致')
    }

    const temporaryPath = join(
      this.getConfig('ATTACH_UPLOAD_LARGE_FILE_PATH'),
      `.${uploadPath.fileName}.${randomUUID()}.uploading`,
    )
    let output: Awaited<ReturnType<typeof open>> | undefined

    try {
      await mkdir(this.getConfig('ATTACH_UPLOAD_LARGE_FILE_PATH'), {
        recursive: true,
      })
      output = await open(temporaryPath, 'wx')
      const hash = createHash('md5')

      for (const chunkPath of chunkPaths) {
        const input = createReadStream(chunkPath)
        for await (const chunk of input as AsyncIterable<Buffer>) {
          hash.update(chunk)
          await output.write(chunk)
        }
      }

      await output.close()
      output = undefined

      if (hash.digest('hex') !== dto.fileMd5.toLowerCase()) {
        throw new BadRequestException('文件 MD5 校验失败')
      }

      try {
        await rename(temporaryPath, uploadPath.path)
      } catch (error) {
        if (!isNodeError(error) || error.code !== 'EEXIST') {
          throw error
        }
      }

      await rm(uploadPath.chunkDirectory, { recursive: true, force: true })
      this.scheduleMergedFileDeletion(uploadPath.path)
      return { url, msg: '文件合并成功' }
    } catch (error) {
      if (output) {
        await output.close()
      }
      await rm(temporaryPath, { force: true })
      throw error
    }
  }

  private getConfig(
    key:
      | 'ATTACH_UPLOAD_LARGE_FILE_PATH'
      | 'ATTACH_VIEW_LARGE_FILE_BASE_URL'
      | 'ATTACH_CHUNK_DIR_PATH'
      | 'ATTACH_CHUNK_DIR_SALT',
  ): string {
    return this.configService.get(key, { infer: true })
  }

  private getLargeFilePath(fileMd5: string): {
    path: string
    fileName: string
    chunkDirectory: string
    metadataPath: string
  } {
    const fileName = `${fileMd5.toLowerCase()}.mp4`
    const uploadDirectory = this.getConfig('ATTACH_UPLOAD_LARGE_FILE_PATH')
    const chunkRoot = this.getConfig('ATTACH_CHUNK_DIR_PATH')
    const salt = this.getConfig('ATTACH_CHUNK_DIR_SALT')
    const chunkDirectoryName = createHash('sha256')
      .update(`${salt}${fileMd5.toLowerCase()}`)
      .digest('hex')

    const chunkDirectory = join(chunkRoot, chunkDirectoryName)
    return {
      path: join(uploadDirectory, fileName),
      fileName,
      chunkDirectory,
      metadataPath: join(chunkDirectory, METADATA_FILE_NAME),
    }
  }

  private createUploadId(fileMd5: string): string {
    return createHash('sha256').update(fileMd5.toLowerCase()).digest('hex')
  }

  private validateUploadId(uploadId: string, fileMd5: string): void {
    if (
      !UPLOAD_ID_PATTERN.test(uploadId) ||
      uploadId !== this.createUploadId(fileMd5)
    ) {
      throw new BadRequestException('uploadId 与文件 MD5 不匹配')
    }
  }

  private validateMd5(fileMd5: string): void {
    if (typeof fileMd5 !== 'string' || !MD5_PATTERN.test(fileMd5)) {
      throw new BadRequestException('fileMd5 格式不合法')
    }
  }

  private validateMp4FileName(fileName: string): void {
    if (
      typeof fileName !== 'string' ||
      !fileName.trim() ||
      basename(fileName) !== fileName ||
      extname(fileName).toLowerCase() !== '.mp4'
    ) {
      throw new BadRequestException('仅支持 MP4 文件')
    }
  }

  private validateFileSize(fileSize: number): void {
    if (
      typeof fileSize !== 'number' ||
      !Number.isSafeInteger(fileSize) ||
      fileSize < 1 ||
      fileSize > MAX_ATTACH_FILE_SIZE
    ) {
      throw new BadRequestException('文件大小必须在 1 字节至 10GB 之间')
    }
  }

  private validateInteger(
    value: number,
    name: string,
    minimum: number,
  ): number {
    if (
      typeof value !== 'number' ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > MAX_ATTACH_FILE_SIZE
    ) {
      throw new BadRequestException(`${name} 参数不合法`)
    }
    return value
  }

  private async createOrValidateMetadata(
    metadataPath: string,
    metadata: UploadMetadata,
  ): Promise<void> {
    const existing = await this.readMetadata(metadataPath)
    if (existing) {
      if (
        existing.fileName !== metadata.fileName ||
        (existing.fileSize !== undefined &&
          metadata.fileSize !== undefined &&
          existing.fileSize !== metadata.fileSize) ||
        (existing.chunkTotal !== 0 &&
          metadata.chunkTotal !== 0 &&
          existing.chunkTotal !== metadata.chunkTotal)
      ) {
        throw new BadRequestException('上传信息与已有记录不一致')
      }

      if (existing.chunkTotal === 0 && metadata.chunkTotal !== 0) {
        await writeFile(metadataPath, JSON.stringify(metadata))
      }
      return
    }

    await writeFile(metadataPath, JSON.stringify(metadata), { flag: 'wx' })
  }

  private async readMetadata(
    path: string,
  ): Promise<UploadMetadata | undefined> {
    try {
      const value: unknown = JSON.parse(await readFile(path, 'utf8'))
      if (
        typeof value !== 'object' ||
        value === null ||
        typeof (value as Record<string, unknown>).fileName !== 'string' ||
        typeof (value as Record<string, unknown>).chunkTotal !== 'number'
      ) {
        throw new BadRequestException('上传记录损坏')
      }
      return value as UploadMetadata
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return undefined
      }
      throw error
    }
  }

  private async listUploadedChunks(directory: string): Promise<number[]> {
    let entries: Dirent[]
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return []
      }
      throw error
    }

    const chunks: number[] = []
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const match = entry.name.match(/^(\d+)\.part$/)
      if (!match) continue
      const index = Number(match[1])
      if (Number.isSafeInteger(index)) chunks.push(index)
    }
    return chunks.sort((left, right) => left - right)
  }

  private async getRegularFileStat(path: string) {
    try {
      const fileStat = await stat(path)
      return fileStat.isFile() ? fileStat : undefined
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return undefined
      }
      throw error
    }
  }

  private async isRegularFile(path: string): Promise<boolean> {
    return (await this.getRegularFileStat(path)) !== undefined
  }

  private createViewUrl(baseUrl: string, fileName: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(fileName)}`
  }

  private scheduleMergedFileDeletion(filePath: string): void {
    const timer = setTimeout(() => {
      void this.deleteMergedFile(filePath)
    }, MERGED_FILE_DELETE_DELAY_MS)
    timer.unref()
  }

  private async deleteMergedFile(filePath: string): Promise<void> {
    try {
      await rm(filePath)
      this.logger.log(`合并文件删除成功: ${filePath}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? (error.stack ?? message) : message
      this.logger.error(`合并文件删除失败: ${filePath}; ${message}`, stack)
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  )
}
