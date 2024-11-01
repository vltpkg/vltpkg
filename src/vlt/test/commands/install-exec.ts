// just a stub for now
import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/install-exec.js')
  >('../../src/commands/install-exec.js')
  const USAGE = (await usage()).usage()
  t.matchSnapshot(USAGE, 'usage')
  t.capture(console, 'log')
  t.capture(console, 'error')
  await command({ positionals: [] } as unknown as LoadedConfig)
})
