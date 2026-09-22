export interface ProbeFile {
  path: string
  originalname: string
  size: number
}

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
