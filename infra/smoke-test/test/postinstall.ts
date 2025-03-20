import t from 'tap'
import { Variants } from './fixtures/variants.ts'
import { runBase } from './fixtures/run.ts'

t.test('working postinstall', async t => {
  const { rootCompile: V } = Variants
  await V.setup?.({ dir: V.dir })
  const { status, stderr, stdout } = await runBase(V, t)
  t.equal(status, 0)
  t.ok(stdout)
  t.notOk(stderr)
})

t.test('postinstall failed', async t => {
  const { rootCompileNoScripts: V } = Variants
  await V.setup?.({ dir: V.dir })
  const { status, stderr, stdout } = await runBase(V, t)
  t.ok(typeof status === 'number' && status > 0)
  t.notOk(stdout)
  t.ok(stderr, 'wrote something to stderr')
})
