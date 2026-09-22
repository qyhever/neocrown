import {
  BadRequestException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { VideoService } from './video.service'

jest.mock('node:child_process', () => ({ execFile: jest.fn() }))

describe('VideoService', () => {
  const service = new VideoService()
  const mockedExecFile = jest.mocked(execFile)
  let directory: string
  let path: string

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'neocrown-probe-spec-'))
    path = join(directory, 'input')
    await writeFile(path, 'temporary data')
    mockedExecFile.mockReset()
  })

  afterEach(async () => {
    expect(await readdir(directory)).toEqual([])
    await rm(directory, { recursive: true, force: true })
  })

  function respond(error: Error | null, stdout = '') {
    mockedExecFile.mockImplementation((...args: unknown[]) => {
      const callback = args.at(-1) as (
        error: Error | null,
        result: { stdout: string; stderr: string },
      ) => void
      callback(error, { stdout, stderr: '' })
      return undefined as never
    })
  }

  const file = () => ({ path, originalname: 'source.mp4', size: 14 })

  it('returns structured media streams and null for missing values', async () => {
    respond(
      null,
      JSON.stringify({
        format: { format_name: 'mp4', duration: '1.5', bit_rate: '8000' },
        streams: [
          {
            index: 0,
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            avg_frame_rate: '30000/1001',
          },
          {
            index: 1,
            codec_type: 'audio',
            codec_name: 'aac',
            sample_rate: '48000',
            channels: 2,
          },
          { index: 2, codec_type: 'subtitle', codec_name: 'subrip' },
        ],
      }),
    )
    const result = await service.probe(file())
    expect(result).toMatchObject({
      fileName: 'source.mp4',
      duration: 1.5,
      bitrate: 8000,
    })
    expect(result.streams).toHaveLength(2)
    expect(result.streams[0]).toMatchObject({
      codec: 'h264',
      width: 1920,
      frameRate: '30000/1001',
      bitrate: null,
    })
    expect(result.streams[1]).toMatchObject({
      type: 'audio',
      sampleRate: 48000,
      channels: 2,
      pixelFormat: null,
    })
    expect(mockedExecFile).toHaveBeenCalledWith(
      'ffprobe',
      expect.any(Array),
      expect.objectContaining({ timeout: 15_000, maxBuffer: 1024 * 1024 }),
      expect.any(Function),
    )
  })

  it('rejects media without a video stream', async () => {
    respond(null, JSON.stringify({ streams: [{ codec_type: 'audio' }] }))
    await expect(service.probe(file())).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('rejects invalid probe output', async () => {
    respond(null, '{invalid')
    await expect(service.probe(file())).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('reports a probe timeout', async () => {
    respond(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))
    await expect(service.probe(file())).rejects.toBeInstanceOf(
      RequestTimeoutException,
    )
  })

  it('reports an unavailable probe binary', async () => {
    respond(Object.assign(new Error('missing'), { code: 'ENOENT' }))
    await expect(service.probe(file())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })

  it('rejects a probe failure', async () => {
    respond(new Error('probe failed'))
    await expect(service.probe(file())).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })
})
