import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiValidationErrorResponse,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { AttachService } from './attach.service'
import {
  type AttachUploadFile,
  type AttachUploadResult,
  type LargeFileChunkUploadRequest,
  type MergeLargeFileUploadResult,
  type VerifyLargeFileUploadResult,
} from './attach.types'
import {
  MergeLargeFileUploadDto,
  UploadLargeFileChunkBodyDto,
  VerifyLargeFileUploadDto,
} from './dto/large-file-upload.dto'

class AttachUploadResultDto implements AttachUploadResult {
  @ApiProperty({ description: '存储文件名' })
  fileName!: string

  @ApiProperty({ description: '原始文件名' })
  originName!: string

  @ApiProperty({ description: '文件访问地址' })
  url!: string
}

class VerifyLargeFileUploadResultDto implements VerifyLargeFileUploadResult {
  @ApiProperty({ description: '是否已存在完整文件' })
  isExists!: boolean

  @ApiProperty({ description: '文件访问地址' })
  url!: string

  @ApiProperty({ description: '分片上传 ID' })
  uploadId!: string

  @ApiProperty({ description: '已上传分片索引列表', type: [Number] })
  uploadedChunks!: number[]
}

class MergeLargeFileUploadResultDto implements MergeLargeFileUploadResult {
  @ApiProperty({ description: '文件访问地址' })
  url!: string

  @ApiProperty({ description: '合并结果说明' })
  msg!: string
}

@ApiTags('附件')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller()
export class AttachController {
  constructor(private readonly attachService: AttachService) {}

  @Post('attach/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传普通附件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiWrappedCreatedResponse({
    description: '普通附件上传成功',
    message: '请求成功',
    data: { model: AttachUploadResultDto },
  })
  @ApiValidationErrorResponse()
  upload(@UploadedFile() file?: AttachUploadFile): Promise<AttachUploadResult> {
    if (!file) {
      throw new BadRequestException('必须提供文件')
    }

    return this.attachService.upload(file)
  }

  @Post('upload/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '预检大文件上传' })
  @ApiWrappedOkResponse({
    description: '大文件上传预检成功',
    message: '请求成功',
    data: { model: VerifyLargeFileUploadResultDto },
  })
  @ApiValidationErrorResponse()
  verifyLargeFile(
    @Body() dto: VerifyLargeFileUploadDto,
  ): Promise<VerifyLargeFileUploadResult> {
    return this.attachService.verifyLargeFileUpload(dto)
  }

  @Post('upload/chunk')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('chunk'))
  @ApiOperation({ summary: '上传大文件分片' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'chunkIndex', type: Number, required: true })
  @ApiQuery({ name: 'chunkTotal', type: Number, required: true })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['chunk', 'uploadId', 'fileMd5', 'fileName'],
      properties: {
        chunk: { type: 'string', format: 'binary' },
        uploadId: { type: 'string' },
        fileMd5: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  @ApiWrappedOkResponse({
    description: '大文件分片上传成功',
    message: '请求成功',
    data: { type: null },
  })
  @ApiValidationErrorResponse()
  uploadLargeFileChunk(
    @UploadedFile() file: AttachUploadFile | undefined,
    @Body() body: UploadLargeFileChunkBodyDto,
    @Query('chunkIndex', ParseIntPipe) chunkIndex: number,
    @Query('chunkTotal', ParseIntPipe) chunkTotal: number,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('必须提供分片文件')
    }

    const request: LargeFileChunkUploadRequest = {
      ...body,
      chunkIndex,
      chunkTotal,
    }
    return this.attachService.uploadLargeFileChunk(file, request)
  }

  @Post('upload/merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '合并大文件分片' })
  @ApiWrappedOkResponse({
    description: '大文件分片合并成功',
    message: '请求成功',
    data: { model: MergeLargeFileUploadResultDto },
  })
  @ApiValidationErrorResponse()
  mergeLargeFile(
    @Body() dto: MergeLargeFileUploadDto,
  ): Promise<MergeLargeFileUploadResult> {
    return this.attachService.mergeLargeFileUpload(dto)
  }
}
