import t from 'tap'
import type { Test } from 'tap'

type Clonefile = typeof import('../src/clonefile.ts')

type FakeOptions = {
  /** clonefile's return value */
  ret?: number
  /** errno after a failed clonefile */
  errno?: number
  throwAt?: 'lib' | 'sym'
}

// what `node:ffi` is asked for, recording every call
const fakeFfi = ({ ret = 0, errno = 0, throwAt }: FakeOptions) => {
  const calls: unknown[][] = []
  class DynamicLibrary {
    constructor(path: string) {
      calls.push(['open', path])
      if (throwAt === 'lib') throw new Error('dlopen failed')
    }
    getFunction(name: string, signature: unknown) {
      calls.push(['sym', name, signature])
      if (throwAt === 'sym') throw new Error('dlsym failed')
      return name === 'clonefile' ?
          (...args: unknown[]) => {
            calls.push(['clonefile', ...args])
            return ret
          }
        : () => 42n
    }
  }
  const getInt32 = (pointer: bigint, offset: number) => {
    calls.push(['errno', pointer, offset])
    return errno
  }
  return { ffi: { DynamicLibrary, getInt32 }, calls }
}

const load = async (
  t: Test,
  {
    platform = 'darwin',
    builtin = true,
    ...fake
  }: FakeOptions & { platform?: string; builtin?: boolean } = {},
) => {
  const { ffi, calls } = fakeFfi(fake)
  t.intercept(process, 'platform', { value: platform })
  const loads = t.capture(
    process,
    'getBuiltinModule',
    (id: string) => {
      t.equal(id, 'node:ffi')
      // what loading it does, as experimental
      process.emitWarning(
        'FFI is an experimental feature and might change at any time',
        'ExperimentalWarning',
      )
      return ffi
    },
  )
  const mod = await t.mockImport<Clonefile>('../src/clonefile.ts', {
    'node:module': {
      isBuiltin: (id: string) => builtin && id === 'node:ffi',
    },
  })
  return { ...mod, calls, loads }
}

t.test('available on darwin with node:ffi only', async t => {
  for (const [platform, builtin] of [
    ['linux', true],
    ['win32', true],
    ['darwin', false],
  ] as const) {
    const { cloneAvailable, cloneDir, calls, loads } = await load(t, {
      platform,
      builtin,
    })
    t.equal(cloneAvailable(), false, `${platform} ${builtin}`)
    t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP')
    t.strictSame(calls, [], 'ffi never touched')
    t.strictSame(loads(), [], 'ffi never loaded')
  }
  const { cloneAvailable } = await load(t)
  t.equal(cloneAvailable(), true)
})

t.test('clones through libSystem, loaded once', async t => {
  const { cloneDir, calls, loads } = await load(t)
  t.equal(cloneDir('/s/a', '/p/.a.1'), true)
  t.equal(cloneDir('/s/b', '/p/.b.1'), true)
  t.equal(loads().length, 1, 'node:ffi loaded once')
  t.strictSame(calls, [
    ['open', 'libSystem.B.dylib'],
    [
      'sym',
      'clonefile',
      { return: 'int32', arguments: ['string', 'string', 'uint32'] },
    ],
    ['sym', '__error', { return: 'pointer', arguments: [] }],
    ['clonefile', '/s/a', '/p/.a.1', 0],
    ['clonefile', '/s/b', '/p/.b.1', 0],
  ])
})

t.test('a failure reports errno by code', async t => {
  const { cloneDir, calls } = await load(t, { ret: -1, errno: 45 })
  t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP')
  t.strictSame(calls.at(-1), ['errno', 42n, 0], 'read from __error()')
  const { cloneDir: exdev } = await load(t, { ret: -1, errno: 18 })
  t.equal(exdev('/s/a', '/p/.a.1'), 'EXDEV')
  const { cloneDir: unknown } = await load(t, { ret: -1, errno: 999 })
  t.equal(unknown('/s/a', '/p/.a.1'), 'E999')
})

t.test('no usable ffi: unavailable, and not retried', async t => {
  for (const throwAt of ['lib', 'sym'] as const) {
    const { cloneDir, loads } = await load(t, { throwAt })
    t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP', throwAt)
    t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP')
    t.equal(loads().length, 1, 'not loaded again')
  }
})

t.test('only the ffi experimental warning is swallowed', async t => {
  const { ffi } = fakeFfi({})
  t.intercept(process, 'platform', { value: 'darwin' })
  const warned = t.capture(process, 'emitWarning')
  t.intercept(process, 'getBuiltinModule', {
    value: () => {
      process.emitWarning(
        'FFI is an experimental feature and might change at any time',
        'ExperimentalWarning',
      )
      process.emitWarning('FFI is an experimental feature', {
        type: 'ExperimentalWarning',
      })
      process.emitWarning('something else', 'ExperimentalWarning')
      process.emitWarning('deprecated', {
        type: 'DeprecationWarning',
      })
      process.emitWarning('plain')
      return ffi
    },
  })
  const { cloneDir } = await t.mockImport<Clonefile>(
    '../src/clonefile.ts',
    { 'node:module': { isBuiltin: () => true } },
  )
  const restored = process.emitWarning
  t.equal(cloneDir('/s/a', '/p/.a.1'), true)
  t.equal(process.emitWarning, restored, 'restored after loading')
  t.strictSame(
    warned().map(c => c.args),
    [
      ['something else', 'ExperimentalWarning'],
      ['deprecated', { type: 'DeprecationWarning' }],
      ['plain'],
    ],
  )
})
