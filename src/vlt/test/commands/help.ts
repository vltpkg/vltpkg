import t from 'tap'
import { mockConfig } from '../fixtures/run.ts'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.ts')
  >('../../src/commands/help.ts')
  const USAGE = usage().usage()
  t.matchSnapshot(USAGE, 'usage')
  const { Config } = await mockConfig(t)
  const { result } = await command(await Config.load())
  t.matchSnapshot(result, 'output')
})
