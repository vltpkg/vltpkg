import assert from 'node:assert'
import type { SpawnOptions } from 'node:child_process'
import { readdirSync } from 'node:fs'
import t from 'tap'
import type { Test } from 'tap'

const mockRollbackRemove = async (
  t: Test,
  { testdir }: { testdir: Parameters<Test['testdir']>[0] },
) => {
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

  let mockedSpawn: MockSpawn | null = null

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
    mockedSpawn = cp
    return cp
  }

  const { RollbackRemove } = await t.mockImport<
    typeof import('../src/index.ts')
  >('../src/index.ts', {
    child_process: {
      spawn: mockSpawn,
    },
  })

  t.chdir(t.testdir(testdir))

  return {
    remover: new RollbackRemove(),
    hasSpawned: () => mockedSpawn !== null,
    getSpawn: () => {
      assert(mockedSpawn)
      return mockedSpawn
    },
  }
}

t.test('delete some stuff', async t => {
  const { remover, getSpawn, hasSpawned } = await mockRollbackRemove(
    t,
    {
      testdir: {
        a: {
          b: '',
          c: '',
        },
        d: {
          e: '',
          f: '',
        },
      },
    },
  )

  // no-op if nothing has been removed
  remover.confirm()
  t.strictSame(hasSpawned(), false)

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
  t.matchStrict(getSpawn(), {
    cmd: process.execPath,
    args: [/[\\/]remove\.ts$/],
    options: { detached: true },
    written: [
      /^a[\\/]\.VLT\.DELETE\.[0-9]+\.b\x00$/,
      /^.[\\/]\.VLT\.DELETE\.[0-9]+\.d\x00$/,
    ],
    stdinEnded: true,
    reffed: false,
  })
})

t.test('do not delete some stuff', async t => {
  const { remover, hasSpawned } = await mockRollbackRemove(t, {
    testdir: {
      a: {
        b: '',
        c: '',
      },
      d: {
        e: '',
        f: '',
      },
    },
  })

  // no-op if nothing has been removed
  remover.confirm()
  t.strictSame(hasSpawned(), false)

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
  t.strictSame(hasSpawned(), false)
  t.strictSame(new Set(readdirSync('a')), new Set(['b', 'c']))
  t.strictSame(
    new Set(readdirSync(t.testdirName)),
    new Set(['d', 'a']),
  )
})

t.test('compiled', async t => {
  t.intercept(process, 'env', {
    value: { __VLT_INTERNAL_COMPILED: 'true' },
  })

  const { remover, getSpawn } = await mockRollbackRemove(t, {
    testdir: {
      a: {
        b: '',
      },
    },
  })

  await remover.rm('a/b')

  remover.confirm()

  t.matchStrict(getSpawn(), {
    args: [],
    options: {
      detached: true,
      env: {
        __VLT_INTERNAL_MAIN: /^file:.*[\\/]remove\.ts$/,
      },
    },
    reffed: false,
  })
})

t.test('deno', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno?: any },
    'Deno',
    {
      value: {},
    },
  )

  t.intercept(process, 'platform', { value: 'linux' })

  const { remover, getSpawn } = await mockRollbackRemove(t, {
    testdir: {
      a: {
        b: '',
      },
    },
  })

  await remover.rm('a/b')

  remover.confirm()

  t.matchStrict(getSpawn(), {
    args: [
      '--unstable-node-globals',
      '--unstable-bare-node-builtins',
      /[\\/]remove\.ts$/,
    ],
    options: {
      detached: true,
    },
    reffed: false,
  })
})

t.test('deno + windows', async t => {
  t.intercept(
    globalThis as typeof globalThis & { Deno?: any },
    'Deno',
    {
      value: {},
    },
  )

  t.intercept(process, 'platform', { value: 'win32' })

  const { remover, getSpawn } = await mockRollbackRemove(t, {
    testdir: {
      a: {
        b: '',
      },
    },
  })

  await remover.rm('a/b')

  remover.confirm()

  t.matchStrict(getSpawn(), {
    args: [
      '--unstable-node-globals',
      '--unstable-bare-node-builtins',
      /[\\/]remove\.ts$/,
    ],
    options: {
      detached: false,
    },
    reffed: true,
  })
})
