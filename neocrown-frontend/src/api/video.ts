import { post } from '@/utils/request'

export interface MediaStream {
  index: number | null
  type: 'video' | 'audio'
  codec: string | null
  codecLongName: string | null
  profile: string | null
  bitrate: number | null
  duration: number | null
  width: number | null
  height: number | null
  pixelFormat: string | null
  frameRate: string | null
  sampleRate: number | null
  channels: number | null
  channelLayout: string | null
}

export interface VideoProbeResult {
  fileName: string
  fileSize: number
  format: string | null
  formatLongName: string | null
  duration: number | null
  bitrate: number | null
  streams: MediaStream[]
}

export function probeVideo(file: File, onProgress: (percent: number) => void) {
  const data = new FormData()
  data.append('file', file)
  return post<VideoProbeResult>('/video/probe', data, {
    onUploadProgress(event) {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
}
