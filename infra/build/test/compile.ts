import { compile } from '../src/compile.ts'
import t from 'tap'
import { readdirSync } from 'node:fs'

t.test('basic', async t => {
  const dir = t.testdir()
  const res = await compile({
    outdir: dir,
    bins: ['vlt'],
    stdio: 'pipe',
  })
  const contents = readdirSync(res.outdir)
  t.ok(
    contents.includes(
      `vlt${process.platform === 'win32' ? '.exe' : ''}`,
    ),
  )
  t.notOk(
    contents.includes(
      `vlr${process.platform === 'win32' ? '.exe' : ''}`,
    ),
  )
})
