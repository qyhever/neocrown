import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { EnvironmentVariables } from '../config/environment.validation'
import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { KlashService, shanghaiFilename } from './klash.service'
import { transformKlash } from './klash-transform'

const template =
  'proxies:\n  - name: edge1\n    server: old\nproxy-groups:\n  - name: 节点选择\n    proxies:\n      - edge1\n'

describe('KlashService', () => {
  let directory: string
  let templatePath: string
  let resultPath: string
  let service: KlashService
  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'neocrown-klash-'))
    templatePath = join(directory, 'template.yaml')
    resultPath = join(directory, 'results', 'nested')
    await fs.writeFile(templatePath, template)
    const config = new ConfigService<EnvironmentVariables, true>({
      CLA_CONFIG_TEMPLATE_PATH: relative(process.cwd(), templatePath),
      CLA_CONFIG_RESULT_DIR_PATH: relative(process.cwd(), resultPath),
    })
    service = new KlashService(config)
  })
  afterEach(async () => {
    jest.restoreAllMocks()
    await fs.rm(directory, { recursive: true, force: true })
  })
  it('uses Shanghai dates across UTC day and year boundaries', () => {
    expect(shanghaiFilename(new Date('2026-12-31T16:00:00Z'))).toBe(
      '20270101.yaml',
    )
    expect(shanghaiFilename(new Date('2026-12-31T15:59:59Z'))).toBe(
      '20261231.yaml',
    )
  })
  it('creates directories and overwrites from the original template', async () => {
    const result = await service.generate('192.0.2.1\n192.0.2.1')
    expect(result).toEqual({
      filename: shanghaiFilename(),
      ipCount: 2,
      sourceNodeCount: 1,
      generatedNodeCount: 2,
    })
    await service.generate('::1')
    expect(await fs.readFile(join(resultPath, result.filename), 'utf8')).toBe(
      transformKlash(template, ['::1']).content,
    )
    expect(await fs.readdir(resultPath)).toEqual([result.filename])
    expect(await fs.readFile(templatePath, 'utf8')).toBe(template)
  })
  it('replaces files atomically under concurrent requests', async () => {
    const inputs = ['192.0.2.1', '::1', '192.0.2.2\n::2']
    await Promise.all(inputs.map((input) => service.generate(input)))
    const content = await fs.readFile(
      join(resultPath, shanghaiFilename()),
      'utf8',
    )
    expect(
      inputs.map(
        (input) => transformKlash(template, input.split('\n')).content,
      ),
    ).toContain(content)
    expect(await fs.readdir(resultPath)).toEqual([shanghaiFilename()])
  })
  it.each(['', 'invalid'])(
    'rejects invalid input before file access',
    async (input) => {
      await fs.rm(templatePath)
      await expect(service.generate(input)).rejects.toBeInstanceOf(
        BadRequestException,
      )
    },
  )
  it('reports read errors without exposing paths', async () => {
    await fs.rm(templatePath)
    await expect(service.generate('::1')).rejects.toThrow(
      '读取 Klash 配置模板失败，请联系管理员',
    )
  })
  it('reports template errors without exposing credentials', async () => {
    await fs.writeFile(templatePath, 'private-secret: broken')
    await expect(service.generate('::1')).rejects.toThrow(
      'Klash 配置模板结构错误，请联系管理员检查节点和代理组',
    )
  })
  it('cleans up a partially written temporary file', async () => {
    await service.generate('192.0.2.1')
    const target = join(resultPath, shanghaiFilename())
    const original = await fs.readFile(target, 'utf8')
    const realWrite = fs.writeFile
    jest.spyOn(fs, 'writeFile').mockImplementationOnce(async (path) => {
      await realWrite(path, 'partial')
      throw new Error('disk full')
    })
    await expect(service.generate('::1')).rejects.toThrow(
      '写入 Klash 配置文件失败',
    )
    expect(await fs.readFile(target, 'utf8')).toBe(original)
    expect(await fs.readdir(resultPath)).toEqual([shanghaiFilename()])
  })
  it.each(['mkdir', 'writeFile', 'rename'] as const)(
    'preserves old result and cleans temporary files if %s fails',
    async (operation) => {
      await service.generate('192.0.2.1')
      const target = join(resultPath, shanghaiFilename())
      const original = await fs.readFile(target, 'utf8')
      const spy = jest
        .spyOn(fs, operation)
        .mockRejectedValueOnce(new Error('private path and secret'))
      await expect(service.generate('::1')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      )
      spy.mockRestore()
      expect(await fs.readFile(target, 'utf8')).toBe(original)
      expect(await fs.readdir(resultPath)).toEqual([shanghaiFilename()])
    },
  )
})
