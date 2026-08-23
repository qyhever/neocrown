import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dayjs from 'dayjs'

// ESM 兼容的 __dirname/__filename
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distfile = path.resolve(__dirname, '../public/meta.json')

const content = {
  deployTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
}
fs.writeFileSync(distfile, JSON.stringify(content, null, 2))

