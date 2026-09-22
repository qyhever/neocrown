import {
  BadRequestException,
  Injectable,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { execFile } from 'node:child_process'
import { unlink } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { MediaStream, ProbeFile, VideoProbeResult } from './video.types'

const execFileAsync = promisify(execFile)

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' && value !== 'N/A'
    ? value
    : null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (value === '' || value === 'N/A') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function streamInfo(value: unknown): MediaStream | null {
  const stream = record(value)
  if (stream.codec_type !== 'video' && stream.codec_type !== 'audio')
    return null
  return {
    index: numberOrNull(stream.index),
    type: stream.codec_type,
    codec: stringOrNull(stream.codec_name),
    codecLongName: stringOrNull(stream.codec_long_name),
    profile: stringOrNull(stream.profile),
    bitrate: numberOrNull(stream.bit_rate),
    duration: numberOrNull(stream.duration),
    width: numberOrNull(stream.width),
    height: numberOrNull(stream.height),
    pixelFormat: stringOrNull(stream.pix_fmt),
    frameRate:
      stringOrNull(stream.avg_frame_rate) ?? stringOrNull(stream.r_frame_rate),
    sampleRate: numberOrNull(stream.sample_rate),
    channels: numberOrNull(stream.channels),
    channelLayout: stringOrNull(stream.channel_layout),
  }
}

@Injectable()
export class VideoService {
  async probe(file: ProbeFile): Promise<VideoProbeResult> {
    try {
      let stdout: string
      try {
        const output = await execFileAsync(
          'ffprobe',
          [
            '-v',
            'error',
            '-show_format',
            '-show_streams',
            '-of',
            'json',
            file.path,
          ],
          { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: 'utf8' },
        )
        stdout = output.stdout
      } catch (error) {
        const code = record(error).code
        if (code === 'ETIMEDOUT')
          throw new RequestTimeoutException('视频解析超时')
        if (code === 'ENOENT')
          throw new ServiceUnavailableException('视频解析服务不可用')
        throw new BadRequestException('无法解析视频文件')
      }

      let data: Record<string, unknown>
      try {
        data = record(JSON.parse(stdout) as unknown)
      } catch {
        throw new BadRequestException('无法解析视频文件')
      }
      const streams = (Array.isArray(data.streams) ? data.streams : [])
        .map(streamInfo)
        .filter((stream): stream is MediaStream => stream !== null)
      if (!streams.some((stream) => stream.type === 'video')) {
        throw new BadRequestException('文件不包含视频流')
      }
      const format = record(data.format)
      return {
        fileName: file.originalname,
        fileSize: file.size,
        format: stringOrNull(format.format_name),
        formatLongName: stringOrNull(format.format_long_name),
        duration: numberOrNull(format.duration),
        bitrate: numberOrNull(format.bit_rate),
        streams,
      }
    } finally {
      await unlink(file.path)
    }
  }
}
