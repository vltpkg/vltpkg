import t from 'tap'
import { type LoadedConfig } from '../../src/config/index.ts'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/install-exec.ts')
  >('../../src/commands/install-exec.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  await command({ positionals: [] } as unknown as LoadedConfig)
})
