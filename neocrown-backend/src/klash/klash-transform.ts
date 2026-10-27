import { isIP } from 'node:net'

/** 按原始行号校验，不去重。 */
export function parseIps(input: string): string[] {
  const ips: string[] = []
  const invalidLines: number[] = []
  input.split(/\r\n|\n|\r/).forEach((line, index) => {
    const ip = line.trim()
    if (!ip) return
    if (!isIP(ip)) invalidLines.push(index + 1)
    ips.push(ip)
  })
  if (invalidLines.length)
    throw new Error(`第 ${invalidLines.join('、')} 行 IP 地址无效`)
  if (!ips.length) throw new Error('请至少输入一个 IP 地址')
  return ips
}

/** 兼容 generate.js 的块式缩进格式；仅插入新增节点和组成员。 */
export function transformKlash(template: string, ips: readonly string[]) {
  const newline = template.includes('\r\n') ? '\r\n' : '\n'
  const lines = template.split(/\r?\n/)

  // 仅处理对应的顶层区段，避免复制 rules、proxy-groups 等后续配置。
  function sectionRange(key: string) {
    const start = lines.findIndex((line) => line === `${key}:`)
    if (start === -1) {
      throw new Error(`模板缺少 ${key} 区段`)
    }
    let end = start + 1
    while (end < lines.length && !/^[^\s#][^:]*:/.test(lines[end])) end++
    return { start, end }
  }

  function readName(line: string): string {
    const value = line.replace(/^\s*- name:\s*/, '').trim()
    const quoted = value.match(
      /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*')(?:\s+#.*)?$/,
    )
    if (value.startsWith('"') || value.startsWith("'")) {
      if (!quoted) throw new Error('模板节点名称引号格式错误')
      const scalar = quoted[1]
      const name: unknown = scalar.startsWith('"')
        ? JSON.parse(scalar)
        : scalar.slice(1, -1).replace(/''/g, "'")
      if (typeof name !== 'string' || !name.trim())
        throw new Error('模板节点名称不能为空')
      return name
    }
    const name = value.replace(/\s+#.*$/, '').trim()
    if (!name) throw new Error('模板节点名称不能为空')
    return name
  }

  const proxyRange = sectionRange('proxies')
  const itemIndexes: number[] = []
  for (let index = proxyRange.start + 1; index < proxyRange.end; index++) {
    if (/^ {2}- name:\s*\S/.test(lines[index])) itemIndexes.push(index)
  }
  if (itemIndexes.length === 0) {
    throw new Error('模板 proxies 下必须包含节点（格式为两空格缩进的 - name:）')
  }

  const nodes = itemIndexes.map((start, index) => {
    const end = itemIndexes[index + 1] ?? proxyRange.end
    const node = lines.slice(start, end)
    while (node.length && /^\s*(#.*)?$/.test(node[node.length - 1])) node.pop()
    if (node.filter((line) => /^ {4}server:\s*\S/.test(line)).length !== 1) {
      throw new Error('模板每个节点必须包含一个 server 字段')
    }
    return { name: readName(node[0]), lines: node }
  })

  const usedNames = new Set(nodes.map((node) => node.name))
  const newNames: string[] = []
  const newNodes: string[] = []
  for (const node of nodes) {
    const suffix = node.name.match(/^(.*?)(\d+)$/)
    const prefix = suffix ? suffix[1] : `${node.name}-`
    let number = suffix ? BigInt(suffix[2]) : 0n
    for (const ip of ips) {
      let name: string
      do {
        name = `${prefix}${++number}`
      } while (usedNames.has(name))
      usedNames.add(name)
      newNames.push(name)
      newNodes.push(
        ...node.lines.map((line, index) => {
          if (index === 0) return `  - name: ${JSON.stringify(name)}`
          if (/^ {4}server:/.test(line))
            return `    server: ${JSON.stringify(ip)}`
          return line
        }),
      )
    }
  }

  const groupRange = sectionRange('proxy-groups')
  let groupStart = -1
  for (let index = groupRange.start + 1; index < groupRange.end; index++) {
    if (
      /^ {2}- name:/.test(lines[index]) &&
      /^(?:🚀\s*)?节点选择$/.test(readName(lines[index]).trim())
    ) {
      groupStart = index
      break
    }
  }
  if (groupStart === -1) throw new Error('模板缺少“节点选择”代理组')

  let groupEnd = groupStart + 1
  while (groupEnd < groupRange.end && !/^ {2}- /.test(lines[groupEnd]))
    groupEnd++
  let listStart = groupStart + 1
  while (listStart < groupEnd && !/^ {4}proxies:\s*$/.test(lines[listStart]))
    listStart++
  if (listStart === groupEnd)
    throw new Error('“节点选择”代理组缺少 proxies 列表')
  let listEnd = listStart + 1
  while (listEnd < groupEnd) {
    const line = lines[listEnd]
    if (/^ {6}- \S/.test(line) || /^\s*(#.*)?$/.test(line)) {
      listEnd++
      continue
    }
    if (/^\s*-/.test(line) || /^ {6}\S/.test(line))
      throw new Error('代理组 proxies 必须使用六空格缩进的块式列表')
    break
  }

  // 从后往前插入，保证前面的行号不受影响。
  const insertions = [
    { index: proxyRange.end, lines: [...newNodes, ''] },
    {
      index: listEnd,
      lines: newNames.map((name) => `      - ${JSON.stringify(name)}`),
    },
  ].sort((a, b) => b.index - a.index)
  for (const insertion of insertions)
    lines.splice(insertion.index, 0, ...insertion.lines)

  return {
    content: lines.join(newline),
    sourceNodeCount: nodes.length,
    generatedNodeCount: newNames.length,
  }
}
