import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import type { EnvironmentVariables } from '../config/environment.validation'
import type { GenerateKlashResultDto } from './klash.dto'
import { parseIps, transformKlash } from './klash-transform'

export function shanghaiFilename(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) =>
    parts.find((value) => value.type === type)!.value
  return `${part('year')}${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}.yaml`
}

@Injectable()
export class KlashService {
  private readonly logger = new Logger(KlashService.name)

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async generate(input: string): Promise<GenerateKlashResultDto> {
    let ips: string[]
    try {
      ips = parseIps(input)
    } catch (error) {
      throw new BadRequestException((error as Error).message)
    }
    let template: string
    try {
      template = await readFile(
        resolve(this.config.get('CLA_CONFIG_TEMPLATE_PATH', { infer: true })),
        'utf8',
      )
    } catch (error) {
      this.logger.error(
        {
          message: '读取 Klash 配置模板失败',
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
      )
      throw new InternalServerErrorException(
        '读取 Klash 配置模板失败，请联系管理员',
      )
    }
    let result: ReturnType<typeof transformKlash>
    try {
      result = transformKlash(template, ips)
    } catch {
      throw new InternalServerErrorException(
        'Klash 配置模板结构错误，请联系管理员检查节点和代理组',
      )
    }
    const filename = shanghaiFilename()
    let temporaryPath: string | undefined
    try {
      const directory = resolve(
        this.config.get('CLA_CONFIG_RESULT_DIR_PATH', { infer: true }),
      )
      await mkdir(directory, { recursive: true })
      temporaryPath = join(directory, `.${filename}.${randomUUID()}.tmp`)
      await writeFile(temporaryPath, result.content, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      })
      await chmod(temporaryPath, 0o644)
      await rename(temporaryPath, join(directory, filename))
    } catch {
      throw new InternalServerErrorException(
        '写入 Klash 配置文件失败，请联系管理员',
      )
    } finally {
      if (temporaryPath)
        await rm(temporaryPath, { force: true }).catch(() => undefined)
    }
    return {
      filename,
      ipCount: ips.length,
      sourceNodeCount: result.sourceNodeCount,
      generatedNodeCount: result.generatedNodeCount,
    }
  }
}
