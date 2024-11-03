import t from 'tap'
import { mockConfig } from '../fixtures/run.js'

t.test('basic', async t => {
  const { usage, command } = await t.mockImport<
    typeof import('../../src/commands/help.js')
  >('../../src/commands/help.js')
  const USAGE = (await usage()).usage()
  t.matchSnapshot(USAGE, 'usage')
  const { Config } = await mockConfig(t)
  const result = await command(await Config.load())
  t.matchSnapshot(result, 'output')
})
