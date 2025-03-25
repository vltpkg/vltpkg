import t from 'tap'
import { runMultiple } from './fixtures/run.ts'
import Cli from '@vltpkg/cli-sdk/package.json' with { type: 'json' }

t.test('--version', async t => {
  const { stdout } = await runMultiple(t, ['--version'])
  t.equal(stdout, Cli.version)
})
