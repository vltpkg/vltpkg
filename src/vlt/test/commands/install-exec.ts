import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/install-exec.js')
  >('../../src/commands/install-exec.js')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  await command({ positionals: [] } as unknown as LoadedConfig)
})
