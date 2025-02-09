import t from 'tap'

const mock = await t.mockImport<typeof import('../src/index.ts')>(
  '../src/index.ts',
  {
    'node:os': {
      platform: () => 'darwin',
      arch: () => 'arm64',
    },
  },
)

t.test('defaults', async t => {
  t.matchSnapshot(mock.defaultOptions(), 'default options')
  t.matchSnapshot(mock.defaultMatrix(), 'defaults')
  t.matchSnapshot(mock.fullMatrix(), 'all defaults')
})

t.test('unsupported', async t => {
  const unsupported = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    'node:os': {
      platform: () => 'unsupported platform',
      arch: () => 'unsupported arch',
    },
  })
  t.strictSame(unsupported.defaultOptions(), mock.defaultOptions())
})
