import { parseIps, transformKlash } from './klash-transform'

const template = `# header
mixed-port: 7890
proxies:
  - name: edge1
    type: ss
    server: original.example
    password: "test-only"
  # source comment
  - name: edge2
    server: other.example

proxy-groups:
  - name: "🚀 节点选择"
    type: select
    proxies:
      - edge1
      # list comment
      - edge2
  - name: other
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,other
# footer
`

describe('parseIps', () => {
  it('trims input, ignores blank lines, retains duplicate IPv4 and IPv6', () => {
    expect(parseIps(' \n 192.0.2.1\r\n2001:db8::1\n192.0.2.1\n')).toEqual([
      '192.0.2.1',
      '2001:db8::1',
      '192.0.2.1',
    ])
  })
  it.each(['', '  \n\t'])('rejects empty input', (input) =>
    expect(() => parseIps(input)).toThrow('至少'),
  )
  it('reports original invalid line numbers', () => {
    expect(() => parseIps('\n192.0.2.1\ninvalid\n999.1.1.1')).toThrow(
      '第 3、4 行',
    )
  })
})

describe('transformKlash', () => {
  it.each(['\n', '\r\n'])(
    'preserves sections, source nodes, comments and %j',
    (newline) => {
      const source = template.replace(/\n/g, newline)
      const result = transformKlash(source, [
        '192.0.2.1',
        '2001:db8::1',
        '192.0.2.1',
      ])
      expect(result).toMatchObject({
        sourceNodeCount: 2,
        generatedNodeCount: 6,
      })
      expect(result.content.startsWith(source.split('proxy-groups:')[0])).toBe(
        true,
      )
      expect(
        result.content.endsWith(
          source.slice(source.indexOf('  - name: other')),
        ),
      ).toBe(true)
      expect(result.content).toContain(
        `      - edge1${newline}      # list comment${newline}      - edge2`,
      )
      for (const name of [
        'edge3',
        'edge4',
        'edge5',
        'edge6',
        'edge7',
        'edge8',
      ]) {
        expect(result.content).toContain(`  - name: "${name}"`)
        expect(result.content).toContain(`      - "${name}"`)
      }
      expect(result.content.match(/server: "192.0.2.1"/g)).toHaveLength(4)
      expect(result.content.match(/server: "2001:db8::1"/g)).toHaveLength(2)
      if (newline === '\r\n')
        expect(result.content.replace(/\r\n/g, '')).not.toContain('\n')
    },
  )
  it.each([
    ['"quote\\"name" # comment', 'quote"name-1'],
    ["'it''s edge'", "it's edge-1"],
    ['plain # comment', 'plain-1'],
    ['edge99999999999999999999', 'edge100000000000000000000'],
  ])('reads names and increments safely: %s', (scalar, name) => {
    const result = transformKlash(
      template.replace('name: edge1', `name: ${scalar}`),
      ['::1'],
    )
    expect(result.content).toContain(`  - name: ${JSON.stringify(name)}`)
  })
  it('accepts a target group before proxies, an empty list, and no trailing newline', () => {
    const source =
      'proxy-groups:\n  - name: 节点选择\n    proxies:\nproxies:\n  - name: edge\n    server: old'
    const result = transformKlash(source, ['::1'])
    expect(result.content).toContain('      - "edge-1"\nproxies:')
    expect(result.content).toContain('    server: "::1"')
  })
  it.each([
    template.replace('proxies:', 'missing:'),
    template.replace('proxy-groups:', 'missing:'),
    template.replaceAll('  - name: edge', '  - invalid: edge'),
    template.replace('    server: other.example', ''),
    template.replace(
      '    server: other.example',
      '    server: a\n    server: b',
    ),
    template.replace('🚀 节点选择', 'other'),
    template.replace('    proxies:', '    missing:'),
    template.replace('    proxies:\n', '    proxies: [edge1]\n'),
    template.replace('"🚀 节点选择"', '"broken'),
  ])('rejects unsupported or missing template structures', (source) => {
    expect(() => transformKlash(source, ['192.0.2.1'])).toThrow()
  })
})
