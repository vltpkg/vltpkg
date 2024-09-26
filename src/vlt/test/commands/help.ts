// just a stub for now
import t from 'tap'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.js')
  >('../../src/commands/help.js')
  t.type(usage, 'function')
  t.type(await usage(), 'string')
  const out = t.capture(console, 'log').args
  t.capture(console, 'error')
  await command(),
    t.strictSame(out()[0]?.[0], await usage(), 'should print usage')
})
