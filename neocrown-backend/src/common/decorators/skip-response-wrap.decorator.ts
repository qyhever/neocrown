import { SetMetadata } from '@nestjs/common'

// 文件下载、SSE 或第三方回调不适合包装，使用此装饰器标记后，响应将不会被包装

export const SKIP_RESPONSE_WRAP_KEY = Symbol('SKIP_RESPONSE_WRAP_KEY')
export const SkipResponseWrap = () => SetMetadata(SKIP_RESPONSE_WRAP_KEY, true)
