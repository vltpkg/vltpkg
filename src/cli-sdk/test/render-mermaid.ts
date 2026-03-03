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

t.test('renderMermaidSvg decodes #64; to @', async t => {
  const { renderMermaidSvg } =
    await import('../src/render-mermaid.ts')

  const svg = renderMermaidSvg(
    'graph TD\n  A["#64;vltpkg/foo"] --> B',
  )
  t.ok(
    svg.includes('@vltpkg/foo'),
    'should decode #64; to @ in SVG output',
  )
  t.notOk(
    svg.includes('#64;'),
    'should not contain raw #64; in SVG output',
  )
})

t.test('renderMermaidSvg error on invalid input', async t => {
  const { renderMermaidSvg } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    'beautiful-mermaid': {
      renderMermaidSVG: () => {
        throw new Error('parse error')
      },
    },
  })

  t.throws(
    () => renderMermaidSvg('invalid'),
    { message: 'Error rendering SVG' },
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

t.test('renderMermaidToPng', async t => {
  const { renderMermaidToPng } =
    await import('../src/render-mermaid.ts')

  const filePath = await renderMermaidToPng('graph TD\n  A --> B')
  t.match(filePath, /graph\.png$/, 'should return png file path')

  const contents = await readFile(filePath)
  // PNG magic bytes: 137 80 78 71 (0x89 0x50 0x4E 0x47)
  t.equal(contents[0], 0x89, 'should start with PNG magic byte')
  t.equal(contents[1], 0x50, 'should have P')
  t.equal(contents[2], 0x4e, 'should have N')
  t.equal(contents[3], 0x47, 'should have G')

  // Call again to exercise the WASM-already-initialized path
  const filePath2 = await renderMermaidToPng('graph TD\n  X --> Y')
  t.match(
    filePath2,
    /graph\.png$/,
    'should work on second call (WASM already init)',
  )
})
