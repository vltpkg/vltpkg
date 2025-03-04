import { bundle } from '../src/bundle.ts'
import t from 'tap'
import { readdirSync } from 'node:fs'

t.test('basic', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
  })
  const contents = readdirSync(res.outdir)
  t.ok(contents.includes('vlt.js'))
  t.ok(contents.includes('vlr.js'))
})

t.test('bins', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
    bins: ['vlr'],
  })
  const contents = readdirSync(res.outdir)
  t.notOk(contents.includes('vlt.js'))
  t.ok(contents.includes('vlr.js'))
})
