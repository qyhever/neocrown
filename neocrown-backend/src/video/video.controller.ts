import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  PayloadTooLargeException,
  Post,
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
} from '@nestjs/swagger'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { diskStorage } from 'multer'
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import type { ProbeFile, VideoProbeResult } from './video.types'
import { VideoService } from './video.service'

export const MAX_VIDEO_SIZE = 500 * 1024 * 1024

const DiskFileInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: tmpdir(),
    filename: (_request, _file, callback) =>
      callback(null, `neocrown-probe-${randomUUID()}`),
  }),
  limits: { fileSize: MAX_VIDEO_SIZE, files: 1 },
})

class VideoUploadInterceptor extends DiskFileInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      return await super.intercept(context, next)
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException('视频文件不能超过 500 MB')
      }
      throw error
    }
  }
}

@ApiTags('视频')
@ApiBearerAuth()
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('probe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(VideoUploadInterceptor)
  @ApiOperation({ summary: '解析视频媒体信息（最大 500 MB）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  probe(@UploadedFile() file?: ProbeFile): Promise<VideoProbeResult> {
    if (!file) throw new BadRequestException('必须提供视频文件')
    return this.videoService.probe(file)
  }
}
