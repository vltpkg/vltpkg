import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import { isClean } from '../src/is-clean.ts'
import { spawn } from '../src/spawn.ts'

const repo = t.testdir()
const o = { cwd: repo }
const write = (file: string, data: string) =>
  writeFile(resolve(repo, file), data)

t.test('create git repo', async () => {
  await spawn(['init'], o)
  await spawn(['config', 'user.name', 'pacotedev'], o)
  await spawn(['config', 'user.email', 'i+pacotedev@izs.me'], o)
  await spawn(['config', 'tag.gpgSign', 'false'], o)
  await spawn(['config', 'commit.gpgSign', 'false'], o)
  await spawn(['config', 'tag.forceSignAnnotated', 'false'], o)
  await write('hello', 'world')
})

t.test('fail if spawned process fails', async t => {
  const { isClean } = await t.mockImport<
    typeof import('../src/is-clean.ts')
  >('../src/is-clean.ts', {
    '../src/spawn.ts': {
      spawn: async () => ({ status: 1, hello: 'world' }),
    },
  })
  await t.rejects(isClean(), {
    message: 'git isClean check failed',
    cause: {
      status: 1,
      hello: 'world',
    },
  })
})

t.test('dir is clean, just one unknown file', t =>
  t.resolveMatch(isClean(o), true),
)

t.test('add the file, no longer clean', t =>
  spawn(['add', 'hello'], o).then(() =>
    t.resolveMatch(isClean(o), false),
  ),
)

t.test('commit the file, clean again', t =>
  spawn(['commit', '-m', 'x'], o).then(() =>
    t.resolveMatch(isClean(o), true),
  ),
)

t.test('edit the file, unclean again', t =>
  write('hello', 'goodbye').then(() =>
    t.resolveMatch(isClean(o), false),
  ),
)

t.test('default to repo', t => {
  const cwd = process.cwd()
  t.teardown(() => process.chdir(cwd))
  process.chdir(repo)
  return t.resolveMatch(isClean(), false)
})
