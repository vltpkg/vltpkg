import { readFile } from 'node:fs/promises'
import t from 'tap'

t.test('renderMermaidSvg', async t => {
  const { renderMermaidSvg } =
    await import('../src/render-mermaid.ts')

  const svg = renderMermaidSvg('graph TD\n  A --> B')
  t.ok(svg.startsWith('<svg'), 'should return SVG markup')
  t.ok(svg.includes('</svg>'), 'should be a complete SVG')
})

t.test('renderMermaidSvg with complex graph', async t => {
  const { renderMermaidSvg } =
    await import('../src/render-mermaid.ts')

  const svg = renderMermaidSvg(
    'graph TD\n  A --> B\n  A --> C\n  B --> D\n  C --> D',
  )
  t.ok(svg.startsWith('<svg'), 'should handle complex graphs')
})

t.test('renderMermaidSvg error on invalid input', async t => {
  const { renderMermaidSvg } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    'beautiful-mermaid': {
      renderMermaidSVG: () => {
        throw new Error('parse error')
      },
      renderMermaidASCII: () => '',
    },
  })

  t.throws(
    () => renderMermaidSvg('invalid'),
    { message: 'Error rendering SVG' },
    'should wrap error with user-friendly message',
  )
})

t.test('renderMermaidAscii', async t => {
  const { renderMermaidAscii } =
    await import('../src/render-mermaid.ts')

  const ascii = renderMermaidAscii('graph TD\n  A --> B')
  t.ok(ascii.length > 0, 'should return non-empty string')
  t.ok(ascii.includes('A'), 'should include node labels')
  t.ok(ascii.includes('B'), 'should include node labels')
})

t.test('renderMermaidAscii error on invalid input', async t => {
  const { renderMermaidAscii } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    'beautiful-mermaid': {
      renderMermaidSVG: () => '',
      renderMermaidASCII: () => {
        throw new Error('parse error')
      },
    },
  })

  t.throws(
    () => renderMermaidAscii('invalid'),
    { message: 'Error rendering ASCII' },
    'should wrap error with user-friendly message',
  )
})

t.test('renderMermaidToFile', async t => {
  const { renderMermaidToFile } =
    await import('../src/render-mermaid.ts')

  const filePath = await renderMermaidToFile('graph TD\n  A --> B')
  t.match(filePath, /graph\.svg$/, 'should return svg file path')

  const contents = await readFile(filePath, 'utf8')
  t.ok(contents.startsWith('<svg'), 'file should contain SVG')
})
