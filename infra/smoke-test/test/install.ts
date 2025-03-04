import t from 'tap'
import { run } from './fixtures/cli-variants.ts'

t.test('help', async t => {
  const { status } = await run(t, 'vlt', ['install', '--help'])
  t.equal(status, 0)
})
