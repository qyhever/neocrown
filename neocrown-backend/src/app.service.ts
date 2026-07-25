import { Injectable } from '@nestjs/common'
import * as path from 'path'
import * as fs from 'fs'
import { AppMetaDto } from './app-meta.dto'

@Injectable()
export class AppService {
  getHello(): string {
    return 'success'
  }
  getMeta(): AppMetaDto {
    const metaStr = fs.readFileSync(
      path.resolve(__dirname, '../public/meta.json'),
      'utf8',
    )
    const meta = JSON.parse(metaStr) as AppMetaDto
    return meta
  }
}
