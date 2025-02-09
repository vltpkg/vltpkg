import { type SpawnOptions } from 'child_process'
import { readdirSync } from 'fs'
import t from 'tap'

const spawns: MockSpawn[] = []
t.beforeEach(() => (spawns.length = 0))

type MockSpawn = {
  cmd: string
  args: string[]
  options: SpawnOptions
  written: Buffer[]
  stdinEnded: boolean
  stdin: {
    write: (chunk: Buffer) => any
    end: () => any
  }
  reffed: boolean
  unref: () => any
}

const mockSpawn = (
  cmd: string,
  args: string[],
  options: SpawnOptions,
): MockSpawn => {
  const cp = {
    cmd,
    args,
    options,
    written: [] as Buffer[],
    stdinEnded: false,
    stdin: {
      write: (chunk: Buffer) => cp.written.push(chunk),
      end: () => (cp.stdinEnded = true),
    },
    reffed: true,
    unref: () => (cp.reffed = false),
  }
  spawns.push(cp)
  return cp
}

t.test('delete some stuff', async t => {
  const { RollbackRemove } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    child_process: {
      spawn: mockSpawn,
    },
  })
  t.chdir(
    t.testdir({
      a: {
        b: '',
        c: '',
      },
      d: {
        e: '',
        f: '',
      },
    }),
  )
  const remover = new RollbackRemove()
  // no-op if nothing has been removed
  remover.confirm()
  t.strictSame(spawns, [])
  await remover.rm('a/b')
  await remover.rm('d')
  await remover.rm('noent')
  t.matchOnly(
    new Set(readdirSync('a')),
    new Set([/^\.VLT\.DELETE\.[0-9]+\.b$/, 'c']),
  )
  t.matchOnly(
    new Set(readdirSync(t.testdirName)),
    new Set([/^\.VLT\.DELETE\.[0-9]+\.d$/, 'a']),
  )
  remover.confirm()
  t.matchStrict(spawns, [
    {
      cmd: process.execPath,
      args: [/[\\/]remove\.ts$/],
      options: { detached: true },
      written: [
        /^a[\\/]\.VLT\.DELETE\.[0-9]+\.b\x00$/,
        /^.[\\/]\.VLT\.DELETE\.[0-9]+\.d\x00$/,
      ],
      stdinEnded: true,
      reffed: false,
    },
  ])
})

t.test('do not delete some stuff', async t => {
  const { RollbackRemove } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    child_process: {
      spawn: mockSpawn,
    },
  })
  t.chdir(
    t.testdir({
      a: {
        b: '',
        c: '',
      },
      d: {
        e: '',
        f: '',
      },
    }),
  )
  const remover = new RollbackRemove()
  // no-op if nothing has been removed
  remover.confirm()
  t.strictSame(spawns, [])
  await remover.rm('a/b')
  await remover.rm('d')
  await remover.rm('noent')
  t.matchOnly(
    new Set(readdirSync('a')),
    new Set([/^\.VLT\.DELETE\.[0-9]+\.b$/, 'c']),
  )
  t.matchOnly(
    new Set(readdirSync(t.testdirName)),
    new Set([/^\.VLT\.DELETE\.[0-9]+\.d$/, 'a']),
  )
  await remover.rollback()
  t.strictSame(spawns, [])
  t.strictSame(new Set(readdirSync('a')), new Set(['b', 'c']))
  t.strictSame(
    new Set(readdirSync(t.testdirName)),
    new Set(['d', 'a']),
  )
})
