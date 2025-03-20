import { bundle } from '../src/bundle.ts'
import t from 'tap'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

t.test('default', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
  })
  const contents = readdirSync(res.outdir)

  t.ok(contents.includes('vlt.js'))
  t.ok(contents.includes('vlr.js'))

  const js = readdirSync(res.outdir)
    .filter(f => /\.js$/.exec(f))
    .map(f => [f, readFileSync(join(res.outdir, f), 'utf8')] as const)

  const codeSplit = js
    .filter(([, v]) =>
      v.includes('var __CODE_SPLIT_SCRIPT_NAME = import'),
    )
    .map(([f]) => f)

  const codeSplitCallers = js.filter(([, v]) =>
    v.includes('var __CODE_SPLIT_SCRIPT_NAME = resolve'),
  )

  t.ok(codeSplit.length, 'code split files found')
  t.ok(codeSplitCallers.length, 'code split callers found')
  t.ok(
    codeSplitCallers.every(([, v]) =>
      codeSplit.some(c =>
        v.includes(`(import.meta.dirname, "${c}")`),
      ),
    ),
    'code split callers reference code split files',
  )
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

t.test('hashbangs', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
    bins: ['vlt'],
    hashbang: true,
  })
  const contents = readFileSync(join(res.outdir, 'vlt.js'), 'utf8')
  t.ok(contents.startsWith('#!/usr/bin/env node'))
})
