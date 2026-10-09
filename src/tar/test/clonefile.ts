import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import t from 'tap'
import type { Test } from 'tap'
import { cloneAvailable, cloneDir } from '../src/clonefile.ts'

// the real thing, before any test fakes the platform: macOS on a Node
// with node:ffi only
const real = cloneAvailable() || 'needs macOS and node:ffi'

type Clonefile = typeof import('../src/clonefile.ts')

type FakeOptions = {
  /** clonefile's return value */
  ret?: number
  /** errno after a failed clonefile */
  errno?: number
  throwAt?: 'lib' | 'sym' | 'call'
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
            if (throwAt === 'call')
              throw new TypeError('bad argument')
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
    const { cloneAvailable, cloneDir, loads } = await load(t, {
      throwAt,
    })
    t.equal(cloneAvailable(), false, throwAt)
    t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP')
    t.equal(loads().length, 1, 'not loaded again')
  }
})

t.test('an ffi call that throws: no clones from then on', async t => {
  const { cloneAvailable, cloneDir, calls } = await load(t, {
    throwAt: 'call',
  })
  t.equal(cloneAvailable(), true, 'loads fine')
  t.equal(cloneDir('/s/a', '/p/.a.1'), 'ENOTSUP')
  t.equal(cloneAvailable(), false)
  t.equal(cloneDir('/s/b', '/p/.b.1'), 'ENOTSUP')
  t.strictSame(
    calls.filter(c => c[0] === 'clonefile'),
    [['clonefile', '/s/a', '/p/.a.1', 0]],
    'not called again',
  )
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

t.test(
  'clonefile(2) through node:ffi',
  { skip: real !== true && real },
  async t => {
    const dir = t.testdir({
      src: {
        'package.json': '{"name":"x"}',
        lib: { 'a.js': 'a', deep: { 'b.js': 'b' } },
      },
    })
    const src = resolve(dir, 'src')
    const dst = resolve(dir, 'dst')
    t.equal(cloneDir(src, dst), true)
    t.strictSame(
      readdirSync(dst, { recursive: true }).sort(),
      readdirSync(src, { recursive: true }).sort(),
    )
    t.equal(readFileSync(resolve(dst, 'lib/deep/b.js'), 'utf8'), 'b')
    // copy-on-write: a write to the clone stays there
    writeFileSync(resolve(dst, 'lib/a.js'), 'changed')
    t.equal(readFileSync(resolve(src, 'lib/a.js'), 'utf8'), 'a')

    t.equal(cloneDir(src, dst), 'EEXIST', 'dst must not exist')
    t.equal(
      cloneDir(resolve(dir, 'missing'), resolve(dir, 'x')),
      'ENOENT',
    )
    mkdirSync(resolve(dir, 'nope'))
    t.equal(
      cloneDir(src, resolve(dir, 'nope/no/dst')),
      'ENOENT',
      'dst parent missing',
    )
  },
)

t.test(
  'the permission model needs --allow-ffi',
  { skip: real !== true && real },
  async t => {
    const mod = fileURLToPath(
      new URL('../src/clonefile.ts', import.meta.url),
    )
    const available = (...flags: string[]) => {
      const env = { ...process.env }
      delete env.NODE_V8_COVERAGE
      // tap puts its loaders in the NODE_OPTIONS of every child, and
      // the permission model denies what they do: a shell drops them
      const { stdout, stderr, status } = spawnSync(
        '/bin/sh',
        [
          '-c',
          'unset NODE_OPTIONS; exec "$@"',
          'sh',
          process.execPath,
          '--permission',
          '--allow-fs-read=*',
          ...flags,
          '--input-type=module',
          '-e',
          `import { cloneAvailable } from ${JSON.stringify(mod)}
          process.stdout.write(String(cloneAvailable()))`,
        ],
        { encoding: 'utf8', env },
      )
      t.equal(status, 0, 'exits', { stderr })
      return stdout
    }
    t.equal(available(), 'false', 'built in, but denied')
    t.equal(available('--allow-ffi'), 'true')
  },
)
