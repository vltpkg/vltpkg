import t from 'tap'
import { LoadedConfig } from '../../src/types.js'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.js')
  >('../../src/commands/help.js')
  const USAGE = (await usage()).usage()
  t.matchSnapshot(USAGE, 'usage')
  const result = await command({} as LoadedConfig)
  t.strictSame(result, USAGE, 'should print usage')
})
