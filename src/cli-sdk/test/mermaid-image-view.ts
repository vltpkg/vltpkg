import t from 'tap'
import type { MermaidOutputGraph } from '@vltpkg/graph'
import type { ViewOptions } from '../src/view.ts'
import type { LoadedConfig } from '../src/config/index.ts'

t.test('MermaidImageView', async t => {
  let capturedMermaidText = ''
  let capturedFormat = ''
  let capturedNodeCount = 0
  let capturedOpenPath = ''
  const stderrMessages: string[] = []

  const { MermaidImageView } = await t.mockImport<
    typeof import('../src/mermaid-image-view.ts')
  >('../src/mermaid-image-view.ts', {
    '@vltpkg/graph': {
      mermaidOutput: (_opts: MermaidOutputGraph) => {
        capturedMermaidText = 'flowchart TD\nmocked'
        return capturedMermaidText
      },
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
    },
    '../src/render-mermaid.ts': {
      renderMermaid: async (
        _text: string,
        format: string,
        nodeCount: number,
        _conf: unknown,
      ) => {
        capturedFormat = format
        capturedNodeCount = nodeCount
        return `/tmp/vlt-mermaid-test/graph.${format}`
      },
    },
  })

  const options: ViewOptions = {}
  const config = {
    values: { view: 'png' },
  } as unknown as LoadedConfig

  const view = new MermaidImageView(options, config)
  t.equal(view.format, 'png', 'should set format from config')

  const fakeResult = {
    edges: [],
    importers: new Set(),
    nodes: [{}, {}, {}],
    highlightSelection: false,
  } as unknown as MermaidOutputGraph

  await view.done(fakeResult, { time: 0 })

  t.equal(capturedFormat, 'png', 'should pass format to renderer')
  t.equal(capturedNodeCount, 3, 'should pass node count to renderer')
  t.equal(
    capturedOpenPath,
    '/tmp/vlt-mermaid-test/graph.png',
    'should open the generated file',
  )
  t.ok(
    stderrMessages.some(m => m.includes('Generating png')),
    'should log generation message',
  )
  t.ok(
    stderrMessages.some(m => m.includes('Image saved to')),
    'should log save path',
  )
})

t.test('MermaidImageView with svg format', async t => {
  let capturedFormat = ''

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
    },
    '../src/render-mermaid.ts': {
      renderMermaid: async (_text: string, format: string) => {
        capturedFormat = format
        return `/tmp/graph.${format}`
      },
    },
  })

  const view = new MermaidImageView({}, {
    values: { view: 'svg' },
  } as unknown as LoadedConfig)
  t.equal(view.format, 'svg', 'should set svg format')

  await view.done(
    {
      edges: [],
      importers: new Set(),
      nodes: [],
      highlightSelection: false,
    } as unknown as MermaidOutputGraph,
    { time: 0 },
  )

  t.equal(capturedFormat, 'svg', 'should render as svg')
})

t.test('MermaidImageView with pdf format', async t => {
  let capturedFormat = ''

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
    },
    '../src/render-mermaid.ts': {
      renderMermaid: async (_text: string, format: string) => {
        capturedFormat = format
        return `/tmp/graph.${format}`
      },
    },
  })

  const view = new MermaidImageView({}, {
    values: { view: 'pdf' },
  } as unknown as LoadedConfig)
  t.equal(view.format, 'pdf', 'should set pdf format')

  await view.done(
    {
      edges: [],
      importers: new Set(),
      nodes: [],
      highlightSelection: false,
    } as unknown as MermaidOutputGraph,
    { time: 0 },
  )

  t.equal(capturedFormat, 'pdf', 'should render as pdf')
})
