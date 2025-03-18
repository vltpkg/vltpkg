import t from 'tap'
import { Variants } from './fixtures/variants.ts'
import { rootCompile, rootCompileNoScripts } from './fixtures/run.ts'

t.before(async () => {
  await Variants.rootCompile.setup?.({
    dir: Variants.rootCompile.dir,
  })
  await Variants.rootCompileNoScripts.setup?.({
    dir: Variants.rootCompileNoScripts.dir,
  })
})

t.test('working postinstall', async t => {
  const { status, stderr, stdout } = await rootCompile(t)
  t.equal(status, 0)
  t.ok(stdout)
  t.notOk(stderr)
})

t.test('postinstall failed', async t => {
  const { status, stderr, stdout } = await rootCompileNoScripts(t)
  t.ok(typeof status === 'number' && status > 0)
  t.notOk(stdout)
  t.ok(stderr, 'wrote something to stderr')
})
