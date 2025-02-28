import t from 'tap'

const { Dashboard, version } = await t.mockImport<
  typeof import('../src/dashboard.ts')
>('../src/dashboard.ts', {
  'package-json-from-dist': {
    loadPackageJson: () => ({ version: '1.2.3' }),
  },
  'node:os': t.createMock(await import('node:os'), {
    homedir: () => t.testdirName,
  }),
})

t.test('dashboard basics', async t => {})
