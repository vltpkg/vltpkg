import t from 'tap'
import type { MermaidOutputGraph } from '@vltpkg/graph'
import type { ViewOptions } from '../src/view.ts'
import type { LoadedConfig } from '../src/config/index.ts'

t.test('MermaidImageView with svg format', async t => {
  let capturedOpenPath = ''
  const stderrMessages: string[] = []

  const { MermaidImageView } = await t.mockImport<
    typeof import('../src/mermaid-image-view.ts')
  >('../src/mermaid-image-view.ts', {
    '@vltpkg/graph': {
      mermaidOutput: (_opts: MermaidOutputGraph) =>
        'flowchart TD\nmocked',
    },
    '@vltpkg/url-open': {
      urlOpen: async (path: string) => {
        capturedOpenPath = path
      },
    },
    '../src/output.ts': {
      stderr: (...args: unknown[]) => {
        stderrMessages.push(String(args[0]))
      },
      stdout: () => {},
    },
    '../src/render-mermaid.ts': {
      renderMermaidToFile: async () =>
        '/tmp/vlt-mermaid-test/graph.svg',
      renderMermaidAscii: () => '',
    },
  })

  const options: ViewOptions = {}
  const config = {
    values: { view: 'svg' },
  } as unknown as LoadedConfig

  const view = new MermaidImageView(options, config)
  t.equal(view.format, 'svg', 'should set format from config')

  const fakeResult = {
    edges: [],
    importers: new Set(),
    nodes: [{}, {}, {}],
    highlightSelection: false,
  } as unknown as MermaidOutputGraph

  await view.done(fakeResult, { time: 0 })

  t.equal(
    capturedOpenPath,
    '/tmp/vlt-mermaid-test/graph.svg',
    'should open the generated file',
  )
  t.ok(
    stderrMessages.some(m => m.includes('Generating SVG')),
    'should log generation message',
  )
  t.ok(
    stderrMessages.some(m => m.includes('Image saved to')),
    'should log save path',
  )
})

t.test('MermaidImageView with ascii format', async t => {
  let capturedOutput = ''

  const { MermaidImageView } = await t.mockImport<
    typeof import('../src/mermaid-image-view.ts')
  >('../src/mermaid-image-view.ts', {
    '@vltpkg/graph': {
      mermaidOutput: () => 'flowchart TD\nmocked',
    },
    '@vltpkg/url-open': {
      urlOpen: async () => {},
    },
    '../src/output.ts': {
      stderr: () => {},
      stdout: (...args: unknown[]) => {
        capturedOutput = String(args[0])
      },
    },
    '../src/render-mermaid.ts': {
      renderMermaidToFile: async () => '',
      renderMermaidAscii: () => 'ASCII ART OUTPUT',
    },
  })

  const view = new MermaidImageView({}, {
    values: { view: 'ascii' },
  } as unknown as LoadedConfig)
  t.equal(view.format, 'ascii', 'should set ascii format')

  await view.done(
    {
      edges: [],
      importers: new Set(),
      nodes: [],
      highlightSelection: false,
    } as unknown as MermaidOutputGraph,
    { time: 0 },
  )

  t.equal(
    capturedOutput,
    'ASCII ART OUTPUT',
    'should output ASCII art to stdout',
  )
})
