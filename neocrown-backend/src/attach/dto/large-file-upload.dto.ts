import { Transform } from 'class-transformer'
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { MAX_ATTACH_FILE_SIZE } from '../attach.types'

const MD5_PATTERN = /^[a-f0-9]{32}$/i
const UPLOAD_ID_PATTERN = /^[a-f0-9]{64}$/i

const toNumber = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value)
  }
  return value
}

export class VerifyLargeFileUploadDto {
  @ApiProperty({
    description: '文件 MD5',
    example: 'd41d8cd98f00b204e9800998ecf8427e',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(MD5_PATTERN, { message: 'fileMd5 必须是 32 位十六进制字符串' })
  fileMd5!: string

  @ApiProperty({ description: '原始文件名', example: 'video.mp4' })
  @IsString()
  @IsNotEmpty()
  fileName!: string

  @ApiProperty({ description: '文件大小，单位为字节', example: 5242880 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACH_FILE_SIZE)
  fileSize!: number
}

export class UploadLargeFileChunkBodyDto {
  @ApiProperty({ description: '分片上传 ID' })
  @IsString()
  @IsNotEmpty()
  @Matches(UPLOAD_ID_PATTERN, { message: 'uploadId 格式不合法' })
  uploadId!: string

  @ApiProperty({ description: '文件 MD5' })
  @IsString()
  @IsNotEmpty()
  @Matches(MD5_PATTERN, { message: 'fileMd5 必须是 32 位十六进制字符串' })
  fileMd5!: string

  @ApiProperty({ description: '原始文件名', example: 'video.mp4' })
  @IsString()
  @IsNotEmpty()
  fileName!: string

  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ATTACH_FILE_SIZE)
  chunkIndex?: number

  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACH_FILE_SIZE)
  chunkTotal?: number
}

export class UploadLargeFileChunkQueryDto {
  @ApiProperty({ description: '从 0 开始的分片索引', example: 0 })
  @Transform(toNumber)
  @IsInt()
  @Min(0)
  @Max(MAX_ATTACH_FILE_SIZE)
  chunkIndex!: number

  @ApiProperty({ description: '分片总数', example: 3 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACH_FILE_SIZE)
  chunkTotal!: number
}

export class MergeLargeFileUploadDto {
  @ApiProperty({ description: '分片上传 ID' })
  @IsString()
  @IsNotEmpty()
  @Matches(UPLOAD_ID_PATTERN, { message: 'uploadId 格式不合法' })
  uploadId!: string

  @ApiProperty({ description: '文件 MD5' })
  @IsString()
  @IsNotEmpty()
  @Matches(MD5_PATTERN, { message: 'fileMd5 必须是 32 位十六进制字符串' })
  fileMd5!: string

  @ApiProperty({ description: '分片总数', example: 3 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(MAX_ATTACH_FILE_SIZE)
  chunkLength!: number
}
