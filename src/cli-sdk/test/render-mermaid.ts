import { writeFile } from 'node:fs/promises'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

const mockConf = {
  projectRoot: '/mock/project',
  options: {},
} as unknown as LoadedConfig

t.test('calculateWidth', async t => {
  const { calculateWidth } = await import('../src/render-mermaid.ts')

  t.equal(
    calculateWidth(0),
    4000,
    'should return minimum width for 0 nodes',
  )
  t.equal(
    calculateWidth(10),
    4000,
    'should return minimum width for small node count',
  )
  t.equal(
    calculateWidth(50),
    5000,
    'should scale up for moderate node count',
  )
  t.equal(
    calculateWidth(500),
    40000,
    'should cap at maximum width for large node count',
  )
  t.equal(
    calculateWidth(1000),
    40000,
    'should cap at maximum width for very large node count',
  )
})

t.test('renderMermaid success', async t => {
  const { renderMermaid } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    '@vltpkg/vlx': {
      resolve: async () => '/mock/bin/mmdc',
    },
    '@vltpkg/run': {
      exec: async (opts: {
        arg0: string
        args: string[]
        cwd: string
        projectRoot: string
      }) => {
        // Simulate mmdc creating the output file
        const outputIdx = opts.args.indexOf('--output')
        const outputFile = opts.args[outputIdx + 1]!
        await writeFile(outputFile, 'fake-image-data')
        t.equal(opts.arg0, '/mock/bin/mmdc')
        t.ok(opts.args.includes('--quiet'))
        t.equal(opts.projectRoot, '/mock/project')
        return { status: 0, stdout: '', stderr: '' }
      },
    },
  })

  const result = await renderMermaid(
    'flowchart TD\na --> b',
    'png',
    10,
    mockConf,
  )
  t.match(result, /graph\.png$/, 'should return png file path')

  const svgResult = await renderMermaid(
    'flowchart TD\na --> b',
    'svg',
    10,
    mockConf,
  )
  t.match(svgResult, /graph\.svg$/, 'should return svg file path')

  const pdfResult = await renderMermaid(
    'flowchart TD\na --> b',
    'pdf',
    10,
    mockConf,
  )
  t.match(pdfResult, /graph\.pdf$/, 'should return pdf file path')
})

t.test('renderMermaid width scaling', async t => {
  const capturedArgs: string[][] = []
  const { renderMermaid } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    '@vltpkg/vlx': {
      resolve: async () => '/mock/bin/mmdc',
    },
    '@vltpkg/run': {
      exec: async (opts: { args: string[] }) => {
        capturedArgs.push(opts.args)
        const outputIdx = opts.args.indexOf('--output')
        const outputFile = opts.args[outputIdx + 1]!
        await writeFile(outputFile, 'fake-image-data')
        return { status: 0, stdout: '', stderr: '' }
      },
    },
  })

  await renderMermaid('flowchart TD\na --> b', 'png', 200, mockConf)
  const widthIdx = capturedArgs[0]!.indexOf('--width')
  t.equal(
    capturedArgs[0]![widthIdx + 1],
    '20000',
    'should scale width based on node count',
  )
})

t.test('renderMermaid error from exec', async t => {
  const { renderMermaid } = await t.mockImport<
    typeof import('../src/render-mermaid.ts')
  >('../src/render-mermaid.ts', {
    '@vltpkg/vlx': {
      resolve: async () => '/mock/bin/mmdc',
    },
    '@vltpkg/run': {
      exec: async () => {
        throw new Error('mmdc failed')
      },
    },
  })

  await t.rejects(
    renderMermaid('invalid', 'png', 5, mockConf),
    {
      message: 'Error generating image',
    },
    'should wrap error with user-friendly message',
  )
})

t.test(
  'renderMermaid error when resolve returns undefined',
  async t => {
    const { renderMermaid } = await t.mockImport<
      typeof import('../src/render-mermaid.ts')
    >('../src/render-mermaid.ts', {
      '@vltpkg/vlx': {
        resolve: async () => undefined,
      },
      '@vltpkg/run': {
        exec: async () => {
          throw new Error('should not be called')
        },
      },
    })

    await t.rejects(
      renderMermaid('invalid', 'png', 5, mockConf),
      {
        message: 'Error generating image',
      },
      'should wrap error when resolve fails',
    )
  },
)
