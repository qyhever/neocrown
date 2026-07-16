import { Injectable } from '@nestjs/common'
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!'
  }
  getMeta(): object {
    const metaStr = fs.readFileSync(
      path.resolve(__dirname, '../public/meta.json'),
      'utf8',
    )
    const meta = JSON.parse(metaStr) as { now: string }
    return meta
  }
}
