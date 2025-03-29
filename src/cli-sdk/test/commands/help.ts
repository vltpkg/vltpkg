import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  const result = await command({
    jack: { usage: () => 'usage' },
  } as LoadedConfig)
  t.equal(result, 'usage')
})
