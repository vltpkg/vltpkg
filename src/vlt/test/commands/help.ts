import t from 'tap'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.js')
  >('../../src/commands/help.js')
  const USAGE = (await usage()).usage()
  t.matchSnapshot(USAGE, 'usage')
  const out = t.capture(console, 'log').args
  t.capture(console, 'error')
  await command()
  t.strictSame(out()[0]?.[0], USAGE, 'should print usage')
})
