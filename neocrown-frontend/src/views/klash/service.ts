import { post } from '@/utils/request'

export interface GenerateKlashRequest {
  ips: string
}

export interface GenerateKlashResult {
  filename: string
  ipCount: number
  sourceNodeCount: number
  generatedNodeCount: number
}

export function generateKlash(data: GenerateKlashRequest) {
  return post<GenerateKlashResult>('/klash/generate', data)
}
