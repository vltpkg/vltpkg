import t from 'tap'

t.test('windows paths', async t => {
  t.intercept(process, 'platform', { value: 'win32' })
  const { paths } =
    await t.mockImport<typeof import('../src/paths.ts')>(
      '../src/paths.ts',
    )
  t.matchSnapshot(paths('some-path'))
})

t.test('unix paths', async t => {
  t.intercept(process, 'platform', { value: 'darwin' })
  const { paths } =
    await t.mockImport<typeof import('../src/paths.ts')>(
      '../src/paths.ts',
    )
  t.matchSnapshot(paths('some-path'))
})
