import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { readFileSync, rmSync, statSync } from 'fs'
import { rm } from 'fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import { cmdShim, cmdShimIfExists } from '../src/index.ts'

const removed: string[] = []
t.beforeEach(() => (removed.length = 0))
const remover = {
  rm: async (path: string) => {
    removed.push(path)
    return rm(path, { force: true })
  },
} as unknown as RollbackRemove

t.afterEach(test =>
  t.matchSnapshot(
    removed.map(r => r.replace(/\\/g, '/')),
    `removed by ${test.name}`,
  ),
)

const fixtures = t.testdir({
  'from.exe': 'exe',
  'from.env': '#!/usr/bin/env node\nconsole.log(/hi/)\n',
  'from.env.args': '#!/usr/bin/env node --expose_gc\ngc()\n',
  'from.env.variables':
    '#!/usr/bin/env NODE_PATH=./lib:$NODE_PATH node',
  'from.sh': '#!/usr/bin/sh\necho hi\n',
  'from.sh.args': '#!/usr/bin/sh -x\necho hi\n',
  'from.env.multiple.variables':
    '#!/usr/bin/env key=value key2=value2 node --flag-one --flag-two',
  'from.env.S': '#!/usr/bin/env -S node --expose_gc\ngc()\n',
  'from.env.nospace': '#!/usr/bin/envnode\nconsole.log(/hi/)\n',
})

t.cleanSnapshot = snap => snap.replace(/\r/g, '\\r')

t.test('no shebang', async t => {
  const from = resolve(fixtures, 'from.exe')
  const to = resolve(fixtures, 'exe.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('if exists (it does exist)', async t => {
  const from = resolve(fixtures, 'from.exe')
  const to = resolve(fixtures, 'exe.shim')
  await cmdShimIfExists(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('if exists (it does not exist)', async t => {
  const from = resolve(fixtures, 'argle bargle we like to sparkle')
  const to = resolve(fixtures, 'argle-bargle-shim')
  await cmdShimIfExists(from, to, remover)
  t.throws(() => statSync(to))
  t.throws(() => statSync(to + '.cmd'))
  t.throws(() => statSync(to + '.ps1'))
})

t.test('fails if from doesnt exist', async t => {
  const from = resolve(fixtures, 'argle bargle we like to sparkle')
  const to = resolve(fixtures, 'argle-bargle-shim')
  await t.rejects(cmdShim(from, to, remover), {
    cause: { cause: { code: 'ENOENT' } },
  })
})

t.test('fails if mkdir fails', async t => {
  const from = resolve(fixtures, 'from.env')
  const to = resolve(fixtures, 'from.env/a/b/c')
  await t.rejects(cmdShim(from, to, remover), {
    cause: {
      cause: {
        code: /^(ENOTDIR|EEXIST|ENOENT)$/,
      },
    },
  })
})

t.test('fails if to is a dir', async t => {
  const from = resolve(fixtures, 'from.env')
  const to = resolve(fixtures)
  t.teardown(() => {
    rmSync(to + '.cmd', { recursive: true, force: true })
  })
  await t.rejects(cmdShim(from, to, remover), {
    cause: { cause: { code: 'EISDIR' } },
  })
})

t.test('just proceed if reading fails', async t => {
  const from = fixtures
  const to = resolve(fixtures, 'env.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('env shebang', async t => {
  const from = resolve(fixtures, 'from.env')
  const to = resolve(fixtures, 'env.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('env shebang with args', async t => {
  const from = resolve(fixtures, 'from.env.args')
  const to = resolve(fixtures, 'env.args.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('env shebang with variables', async t => {
  const from = resolve(fixtures, 'from.env.variables')
  const to = resolve(fixtures, 'env.variables.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('explicit shebang', async t => {
  const from = resolve(fixtures, 'from.sh')
  const to = resolve(fixtures, 'sh.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('explicit shebang with args', async t => {
  const from = resolve(fixtures, 'from.sh.args')
  const to = resolve(fixtures, 'sh.args.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('multiple variables', async t => {
  const from = resolve(fixtures, 'from.env.multiple.variables')
  const to = resolve(fixtures, 'sh.multiple.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'ps1')
})

t.test('shebang with env -S', async t => {
  const from = resolve(fixtures, 'from.env.S')
  const to = resolve(fixtures, 'sh.env.S.shim')
  await cmdShim(from, to, remover)
  t.matchSnapshot(readFileSync(to, 'utf8'), 'shell')
  t.matchSnapshot(readFileSync(to + '.cmd', 'utf8'), 'cmd')
  t.matchSnapshot(readFileSync(to + '.ps1', 'utf8'), 'cmd')
})
