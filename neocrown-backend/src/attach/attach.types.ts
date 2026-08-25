export interface AttachUploadFile {
  originalname: string
  buffer: Buffer
}

export interface AttachUploadResult {
  fileName: string
  originName: string
  url: string
}

export const MAX_ATTACH_FILE_SIZE = 10 * 1024 * 1024 * 1024

export interface VerifyLargeFileUploadResult {
  isExists: boolean
  url: string
  uploadId: string
  uploadedChunks: number[]
}

export interface MergeLargeFileUploadResult {
  url: string
  msg: string
}

export interface LargeFileChunkUploadRequest {
  uploadId: string
  fileMd5: string
  fileName: string
  chunkIndex: number
  chunkTotal: number
}
