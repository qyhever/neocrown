import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common'

const CACHE_BUSTING_QUERY_KEYS = new Set(['t'])

@Injectable()
export class StripCacheBustingQueryPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (!this.shouldStrip(value, metadata)) return value

    return Object.fromEntries(
      Object.entries(value).filter(
        ([key]) => !CACHE_BUSTING_QUERY_KEYS.has(key),
      ),
    )
  }

  private shouldStrip(
    value: unknown,
    metadata: ArgumentMetadata,
  ): value is Record<string, unknown> {
    return (
      metadata.type === 'query' &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    )
  }
}
