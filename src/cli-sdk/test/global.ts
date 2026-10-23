import * as cmdShim from '@vltpkg/cmd-shim'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { Graph } from '@vltpkg/graph'
import type { Spec } from '@vltpkg/spec'
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import * as fsp from 'node:fs/promises'
import { rm } from 'node:fs/promises'
import { delimiter, join, resolve, sep } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import type { GlobalBins } from '../src/global.ts'
import type { ResolvedGlobalBinDir } from '../src/global-bin-dir.ts'

const removers: MockRemover[] = []
// rm under this dir throws
let removeFails: string | undefined
class MockRemover {
  removed: string[] = []
  confirmed = false
  rolledBack = false
  constructor() {
    removers.push(this)
  }
  // like RollbackRemove, a path is only moved aside once
  async rm(path: string) {
    if (removeFails && path.startsWith(removeFails)) {
      throw Object.assign(new Error('nope'), { code: 'EACCES' })
    }
    if (this.removed.includes(path)) return
    this.removed.push(path)
    await rm(path, { force: true })
  }
  confirm() {
    this.confirmed = true
  }
  async rollback() {
    this.rolledBack = true
  }
}

const shims: [string, string][] = []
// set: shims also write `to`, the nth (0-based) then throws
let shimFails: number | undefined
const mockShim = async (from: string, to: string) => {
  shims.push([from, to])
  writeFileSync(to + '.cmd', from)
  if (shimFails !== undefined) {
    writeFileSync(to, from)
    if (!shimFails--) {
      throw Object.assign(new Error('nope'), { code: 'EIO' })
    }
  }
}

const inspected: string[] = []
// symlink(target, path) throws this when path is under `dir`
let symlinkFails:
  | { dir: string; code: string; after?: number; notError?: boolean }
  | undefined
// rm under this dir throws
let rmFails: string | undefined
// rename onto this path throws this code
let renameFails: { path: string; code: string } | undefined

const {
  assertGlobalOptions,
  globalBinsLines,
  isInPath,
  linkGlobalBins,
  parseGlobalAddArgs,
  parseGlobalRemoveArgs,
  removeGlobalPackages,
  removeGlobalWorkspaces,
  unlinkGlobalBins,
} = await t.mockImport<typeof import('../src/global.ts')>(
  '../src/global.ts',
  {
    '@vltpkg/rollback-remove': { RollbackRemove: MockRemover },
    '@vltpkg/cmd-shim': t.createMock(cmdShim, {
      cmdShimIfExists: mockShim,
      findCmdShimIfExists: async (p: string) => {
        inspected.push(p)
        return cmdShim.findCmdShimIfExists(p)
      },
    }),
    'node:fs/promises': t.createMock(fsp, {
      symlink: async (target: string, path: string) => {
        const f = symlinkFails
        if (f && path.startsWith(f.dir)) {
          if (!f.after) {
            const er: unknown =
              f.notError ?
                { code: f.code }
              : Object.assign(new Error('nope'), { code: f.code })
            throw er
          }
          f.after--
        }
        return fsp.symlink(target, path)
      },
      rm: async (path: string, o?: { force?: boolean }) => {
        if (rmFails && path.startsWith(rmFails)) {
          throw Object.assign(new Error('nope'), { code: 'EACCES' })
        }
        return fsp.rm(path, o)
      },
      rename: async (from: string, to: string) => {
        if (renameFails?.path === to) {
          throw Object.assign(new Error('nope'), {
            code: renameFails.code,
          })
        }
        return fsp.rename(from, to)
      },
    }),
  },
)

const wsId = (dir: string): DepID =>
  joinDepIDTuple(['workspace', `packages/${dir}`])

const posix = (t: Test) =>
  t.intercept(process, 'platform', { value: 'linux' })

const setPath = (t: Test, value?: string) => {
  const { PATH } = process.env
  if (value === undefined) delete process.env.PATH
  else process.env.PATH = value
  t.teardown(() => {
    process.env.PATH = PATH
  })
}

type Manifest = (
  spec: Spec,
  opts: { from: string },
) => Promise<{ name?: string }>

const mockConf = (
  projectRoot: string,
  positionals: string[],
  manifest: Manifest = async () => ({}),
  values: Record<string, unknown> = {},
) => {
  const resets: string[] = []
  const conf = {
    projectRoot,
    positionals,
    values,
    options: {
      projectRoot,
      tag: 'latest',
      packageInfo: { manifest },
    },
    resetOptions: (root: string) => resets.push(root),
  } as unknown as LoadedConfig
  return { conf, resets }
}

const readJSON = (f: string) =>
  JSON.parse(readFileSync(f, 'utf8')) as unknown

t.test('assertGlobalOptions', async t => {
  for (const [k, v] of [
    ['workspace', ['a']],
    ['workspace-group', ['g']],
    ['lockfile-only', true],
  ] as const) {
    t.throws(
      () =>
        assertGlobalOptions({
          values: { [k]: v },
        } as unknown as LoadedConfig),
      {
        message: `--${k} is not supported with --global`,
        cause: { code: 'EUSAGE', name: k, found: v },
      },
    )
  }
  t.doesNotThrow(() =>
    assertGlobalOptions({
      values: { 'lockfile-only': false },
    } as unknown as LoadedConfig),
  )
})

t.test('parseGlobalAddArgs', async t => {
  t.test('registry specs', async t => {
    const root = t.testdir({ packages: {} })
    const { conf, resets } = mockConf(root, ['foo@1', '@s/bar'])
    const { add, created, importers } = await parseGlobalAddArgs(conf)
    const foo = resolve(root, 'packages/foo-ws')
    const bar = resolve(root, 'packages/@s+bar-ws')
    t.strictSame(created, [foo, bar])
    t.strictSame(readJSON(resolve(foo, 'package.json')), {
      name: 'foo-ws',
      private: true,
    })
    t.strictSame(readJSON(resolve(bar, 'package.json')), {
      name: '@s/bar-ws',
      private: true,
    })
    t.equal(add.modifiedDependencies, true)
    t.equal(wsId('foo-ws'), 'workspace~packages+foo-ws')
    t.strictSame([...add.keys()], [wsId('foo-ws'), wsId('@s+bar-ws')])
    const dep = add.get(wsId('foo-ws'))?.get('foo')
    t.equal(dep?.type, 'implicit')
    t.equal(String(dep?.spec), 'foo@1')
    t.equal(
      String(add.get(wsId('@s+bar-ws'))?.get('@s/bar')?.spec),
      '@s/bar@latest',
      'bare name gets the default tag',
    )
    t.strictSame(
      importers,
      new Set([wsId('foo-ws'), wsId('@s+bar-ws')]),
    )
    t.strictSame(resets, [root], 'options reset once')

    // existing workspace is reused
    const again = mockConf(root, ['foo@2'])
    const res = await parseGlobalAddArgs(again.conf)
    t.strictSame(res.created, [])
    t.strictSame(again.resets, [], 'no reset')
    t.equal(
      String(res.add.get(wsId('foo-ws'))?.get('foo')?.spec),
      'foo@2',
    )
  })

  t.test('no positionals', async t => {
    const root = t.testdir({ packages: {} })
    const { conf, resets } = mockConf(root, [])
    const { add, created, importers } = await parseGlobalAddArgs(conf)
    t.equal(add.size, 0)
    t.equal(add.modifiedDependencies, false)
    t.strictSame(created, [])
    t.equal(importers, undefined)
    t.strictSame(resets, [])
  })

  t.test('relative file spec, name from manifest', async t => {
    const root = t.testdir({ g: { packages: {} }, cwd: { tool: {} } })
    const cwd = resolve(root, 'cwd')
    t.chdir(cwd)
    const calls: [Spec, { from: string }][] = []
    const { conf } = mockConf(
      resolve(root, 'g'),
      ['./tool'],
      async (spec, opts) => {
        calls.push([spec, opts])
        return { name: 'tool' }
      },
    )
    const { add } = await parseGlobalAddArgs(conf)
    t.equal(calls.length, 1)
    t.equal(calls[0]?.[1].from, process.cwd())
    t.equal(calls[0]?.[0].type, 'file')
    const spec = add.get(wsId('tool-ws'))?.get('tool')?.spec
    t.equal(spec?.name, 'tool')
    t.equal(spec?.type, 'file')
    t.equal(resolve(String(spec?.file)), resolve(cwd, 'tool'))
  })

  t.test('absolute file and named git specs', async t => {
    const root = t.testdir({ packages: {} })
    const { conf } = mockConf(
      root,
      [
        `abs@file:${resolve(root, 'x').replaceAll('\\', '/')}`,
        'github:a/b',
      ],
      async () => ({ name: 'b' }),
    )
    const { add } = await parseGlobalAddArgs(conf)
    t.equal(add.get(wsId('abs-ws'))?.get('abs')?.spec.type, 'file')
    t.equal(
      String(add.get(wsId('b-ws'))?.get('b')?.spec),
      'b@github:a/b',
    )
  })

  t.test('nameless manifest', async t => {
    const root = t.testdir({ packages: {} })
    const { conf } = mockConf(root, ['github:a/b'])
    await t.rejects(parseGlobalAddArgs(conf), {
      message: 'Could not determine package name',
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('unsafe manifest name', async t => {
    const root = t.testdir({ packages: {} })
    const { conf } = mockConf(root, ['github:a/b'], async () => ({
      name: '../../evil',
    }))
    await t.rejects(parseGlobalAddArgs(conf), {
      message: /Invalid package name/,
    })
    t.notOk(existsSync(resolve(root, '../evil-ws')))
  })

  t.test('name differs only in case', async t => {
    const root = t.testdir({
      packages: {
        'Foo-ws': { 'package.json': '{}' },
        '@S+bar-ws': { 'package.json': '{}' },
        'baz-ws': { 'package.json': '{}' },
        'Baz-ws': { 'package.json': '{}' },
      },
    })
    await t.rejects(
      parseGlobalAddArgs(mockConf(root, ['foo']).conf),
      {
        message: 'foo differs only in case from global package Foo',
        cause: { code: 'EUSAGE', found: 'foo' },
      },
    )
    await t.rejects(
      parseGlobalAddArgs(mockConf(root, ['@s/bar']).conf),
      { message: /from global package @S\/bar$/ },
    )
    const { created } = await parseGlobalAddArgs(
      mockConf(root, ['baz']).conf,
    )
    t.strictSame(created, [], 'exact match wins')
  })

  t.test('created workspaces removed on error', async t => {
    const root = t.testdir({ packages: {} })
    const { conf } = mockConf(root, ['foo', 'nope:bar@1'])
    await t.rejects(parseGlobalAddArgs(conf))
    t.notOk(existsSync(resolve(root, 'packages/foo-ws')))
  })
})

t.test('parseGlobalRemoveArgs', async t => {
  const root = t.testdir({
    packages: {
      'foo-ws': { 'package.json': '{}' },
      '@s+bar-ws': { 'package.json': '{}' },
    },
  })
  const { remove, dirs } = parseGlobalRemoveArgs(
    mockConf(root, ['foo', '@s/bar', 'foo']).conf,
  )
  t.equal(remove.modifiedDependencies, true)
  t.strictSame(
    remove,
    new Map([
      [wsId('foo-ws'), new Set(['foo'])],
      [wsId('@s+bar-ws'), new Set(['@s/bar'])],
    ]),
  )
  t.strictSame(dirs, [
    resolve(root, 'packages/foo-ws'),
    resolve(root, 'packages/@s+bar-ws'),
  ])
  t.throws(() => parseGlobalRemoveArgs(mockConf(root, []).conf), {
    message: 'Missing package name(s) to uninstall',
    cause: { code: 'EUSAGE' },
  })
  t.throws(
    () => parseGlobalRemoveArgs(mockConf(root, ['foo', 'nope']).conf),
    {
      message: 'nope is not installed globally',
      cause: { code: 'EUSAGE', found: 'nope' },
    },
  )
  t.throws(
    () => parseGlobalRemoveArgs(mockConf(root, ['FOO']).conf),
    {
      message: 'FOO is not installed globally',
      cause: { code: 'EUSAGE', found: 'FOO', validOptions: ['foo'] },
    },
  )
  t.throws(
    () => parseGlobalRemoveArgs(mockConf(root, ['../x']).conf),
    {
      message: 'Invalid package name',
    },
  )
})

type MockEdge = {
  spec: { name: string }
  to?: { bins?: Record<string, string> }
}

// global project with a ws per entry: { [wsDir]: { [dep]: bins } }
const mockGraph = (
  root: string,
  wss: Record<string, Record<string, MockEdge['to']>>,
) => {
  const mainImporter = { id: joinDepIDTuple(['file', '.']) }
  const importers = new Set<unknown>([mainImporter])
  for (const [dir, deps] of Object.entries(wss)) {
    const location = `./packages/${dir}`
    const full = resolve(root, location)
    importers.add({
      id: wsId(dir),
      location,
      resolvedLocation: () => full,
      nodeModules: () => resolve(full, 'node_modules'),
      edgesOut: new Map<string, MockEdge>(
        Object.entries(deps).map(([name, to]) => [
          name,
          { spec: { name }, to },
        ]),
      ),
    })
  }
  return { importers, mainImporter } as unknown as Graph
}

// canonical, like a resolved bin dir
const binOf = (root: string, dir = 'bin') =>
  resolve(realpathSync.native(root), dir)

const opts = (
  projectRoot: string,
  force = false,
  binDir: Partial<ResolvedGlobalBinDir> = {},
) => ({
  projectRoot,
  scurry: new PathScurry(projectRoot),
  force,
  binDir: {
    dir: binOf(projectRoot),
    source: 'global-dir' as const,
    inPath: false,
    ...binDir,
  },
})

const readState = (root: string) =>
  readJSON(resolve(root, 'global-state.json'))

const target = (root: string, ws: string, dep: string, p: string) =>
  resolve(root, 'packages', ws, 'node_modules', dep, p)

const linkTarget = (root: string, bin: string) =>
  resolve(root, 'bin', readlinkSync(resolve(root, 'bin', bin)))

t.beforeEach(() => {
  removers.length = 0
  shims.length = 0
  shimFails = undefined
  inspected.length = 0
  removeFails = undefined
  symlinkFails = undefined
  rmFails = undefined
  renameFails = undefined
})

t.test('linkGlobalBins', async t => {
  t.test('links bins of targeted workspaces', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        // stale bin of a targeted ws
        old: t.fixture(
          'symlink',
          '../packages/a-ws/node_modules/a/old.js',
        ),
        // bin owned by another ws
        other: t.fixture(
          'symlink',
          '../packages/c-ws/node_modules/c/c.js',
        ),
        // name taken by another ws
        dup: t.fixture(
          'symlink',
          '../packages/c-ws/node_modules/c/dup.js',
        ),
        // foreign file
        foreign: 'not a link',
      },
      packages: {},
    })
    const graph = mockGraph(root, {
      'b-ws': {
        b: { bins: { b: 'b.js', foreign: 'f.js' } },
        none: {},
        missing: undefined,
      },
      'a-ws': {
        a: {
          bins: {
            a: './bin/a.js',
            dup: 'dup.js',
            '': 'x.js',
            'x/y': 'x.js',
            'x\\y': 'x.js',
            '.': 'x.js',
            '..': 'x.js',
          },
        },
      },
      'c-ws': { c: { bins: { other: 'c.js' } } },
    })
    const res = await linkGlobalBins(
      graph,
      opts(root),
      new Set([wsId('a-ws'), wsId('b-ws')]),
    )
    t.strictSame(res, {
      binDir: binOf(root),
      source: 'global-dir',
      bins: ['a', 'b'],
      conflicts: ['dup', 'foreign'],
      inPath: false,
      otherDirs: [],
    })
    t.strictSame(readState(root), { binDirs: [binOf(root)] })
    t.equal(
      linkTarget(root, 'a'),
      target(root, 'a-ws', 'a', 'bin/a.js'),
    )
    t.equal(linkTarget(root, 'b'), target(root, 'b-ws', 'b', 'b.js'))
    t.equal(
      linkTarget(root, 'other'),
      target(root, 'c-ws', 'c', 'c.js'),
      'not targeted, untouched',
    )
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'c-ws', 'c', 'dup.js'),
      'conflict untouched',
    )
    t.equal(
      readFileSync(resolve(root, 'bin/foreign'), 'utf8'),
      'not a link',
    )
    t.notOk(existsSync(resolve(root, 'bin/old')), 'stale bin removed')
    t.notOk(existsSync(resolve(root, 'x.js')))
    t.equal(removers[0]?.confirmed, true)
    t.equal(removers[0]?.rolledBack, false)

    // replacing an owned link
    await linkGlobalBins(graph, opts(root), new Set([wsId('a-ws')]))
    t.equal(
      linkTarget(root, 'a'),
      target(root, 'a-ws', 'a', 'bin/a.js'),
    )
  })

  t.test('--force overwrites conflicts', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        dup: t.fixture(
          'symlink',
          '../packages/c-ws/node_modules/c/dup.js',
        ),
        foreign: 'not a link',
      },
    })
    const graph = mockGraph(root, {
      'a-ws': {
        a: { bins: { dup: 'dup.js', foreign: 'f.js' } },
      },
      'b-ws': { b: { bins: { dup: 'dup.js' } } },
    })
    const res = await linkGlobalBins(graph, opts(root, true))
    t.strictSame(res.bins, ['dup', 'foreign'])
    t.strictSame(res.conflicts, [])
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'b-ws', 'b', 'dup.js'),
      'last one wins',
    )
    t.equal(
      linkTarget(root, 'foreign'),
      target(root, 'a-ws', 'a', 'f.js'),
    )
  })

  t.test('full resync relinks all workspaces', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        // owned by c, which is relinked first now
        dup: t.fixture(
          'symlink',
          '../packages/c-ws/node_modules/c/dup.js',
        ),
        gone: t.fixture(
          'symlink',
          '../packages/gone-ws/node_modules/gone/x.js',
        ),
      },
    })
    const graph = mockGraph(root, {
      'c-ws': { c: { bins: { dup: 'dup.js', c: 'c.js' } } },
      'a-ws': { a: { bins: { dup: 'dup.js' } } },
    })
    const res = await linkGlobalBins(graph, opts(root))
    t.strictSame(res.bins, ['c', 'dup'])
    t.strictSame(res.conflicts, ['dup'])
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'a-ws', 'a', 'dup.js'),
      'sorted by ws path, first wins',
    )
    t.notOk(existsSync(resolve(root, 'bin/gone')))
  })

  t.test('inPath passed through', async t => {
    posix(t)
    const root = t.testdir()
    const res = await linkGlobalBins(
      mockGraph(root, {}),
      opts(root, false, { inPath: true, source: 'config' }),
    )
    t.strictSame(res, {
      binDir: binOf(root),
      source: 'config',
      bins: [],
      conflicts: [],
      inPath: true,
      otherDirs: [],
    })
  })

  t.test('win32 shims', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const root = t.testdir({
      bin: { 'taken.ps1': 'foreign' },
      packages: {
        'a-ws': {
          node_modules: { a: { 'a.js': '', 't.js': '' } },
        },
      },
    })
    const graph = mockGraph(root, {
      'a-ws': {
        a: { bins: { a: 'a.js', taken: 't.js', missing: 'm.js' } },
      },
    })
    const res = await linkGlobalBins(graph, opts(root))
    t.strictSame(res.bins, ['a'], 'missing target not linked')
    t.strictSame(res.conflicts, ['taken'])
    t.strictSame(shims, [
      [
        target(realpathSync.native(root), 'a-ws', 'a', 'a.js'),
        resolve(binOf(root), 'a'),
      ],
    ])
  })

  t.test('--force in a shared dir', async t => {
    posix(t)
    const root = t.testdir({
      self: {
        plain: 'a binary',
        link: t.fixture('symlink', '../npm/link.js'),
        vlt: t.fixture('symlink', '../npm/vlt.js'),
      },
      npm: { 'vlt.js': '' },
    })
    const self = binOf(root, 'self')
    const vlt = resolve(root, 'npm/vlt.js')
    t.intercept(process, 'argv', { value: [process.execPath, vlt] })
    const res = await linkGlobalBins(
      mockGraph(root, {
        'a-ws': {
          a: { bins: { plain: 'p.js', link: 'l.js', vlt: 'v.js' } },
        },
      }),
      opts(root, true, { dir: self, source: 'self', inPath: true }),
    )
    t.strictSame(res.bins, ['link'])
    t.strictSame(res.conflicts, ['plain', 'vlt'])
    t.equal(readFileSync(resolve(self, 'plain'), 'utf8'), 'a binary')
    t.equal(
      realpathSync.native(resolve(self, 'vlt')),
      realpathSync.native(vlt),
      'running vlt kept',
    )
    t.equal(
      resolve(self, readlinkSync(resolve(self, 'link'))),
      target(realpathSync.native(root), 'a-ws', 'a', 'l.js'),
    )
  })

  t.test('--force in a shared dir, win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const root = t.testdir({
      self: {
        'taken.cmd': '@echo off',
        shim: 'exec "$basedir/../npm/s.js" "$@"\n',
      },
      packages: {
        'a-ws': {
          node_modules: { a: { 't.js': '', 's.js': '' } },
        },
      },
    })
    const self = binOf(root, 'self')
    const res = await linkGlobalBins(
      mockGraph(root, {
        'a-ws': {
          a: { bins: { taken: 't.js', shim: 's.js' } },
        },
      }),
      opts(root, true, { dir: self, source: 'self', inPath: true }),
    )
    t.strictSame(res.bins, ['shim'])
    t.strictSame(res.conflicts, ['taken'])
  })

  t.test('rollback on error', async t => {
    posix(t)
    const root = t.testdir({ bin: 'not a dir' })
    await t.rejects(linkGlobalBins(mockGraph(root, {}), opts(root)), {
      code: 'EEXIST',
    })
    t.equal(removers[0]?.rolledBack, true)
    t.equal(removers[0]?.confirmed, false)
  })

  const aGraph = (root: string, bins: Record<string, string>) =>
    mockGraph(root, { 'a-ws': { a: { bins } } })
  const aLink = (p: string) =>
    t.fixture('symlink', `../packages/a-ws/node_modules/a/${p}`)
  const noLink = (p: string) => t.throws(() => lstatSync(p), p)

  t.test('sweeps other bin dirs', async t => {
    posix(t)
    const root = t.testdir({
      old: {
        a: aLink('a.js'),
        foreign: t.fixture('symlink', '../x/x'),
      },
      bin: { b: aLink('b.js') },
      self: {},
      packages: {},
    })
    const [old, self] = [binOf(root, 'old'), binOf(root, 'self')]
    writeFileSync(
      resolve(root, 'global-state.json'),
      JSON.stringify({
        binDirs: [old, binOf(root, 'gone')],
        pathSetup: 'declined',
      }),
    )
    const res = await linkGlobalBins(
      aGraph(root, { a: 'a.js' }),
      opts(root, false, { dir: self, source: 'self', inPath: true }),
    )
    t.strictSame(res, {
      binDir: self,
      source: 'self',
      bins: ['a'],
      conflicts: [],
      inPath: true,
      otherDirs: [old, binOf(root)],
    })
    noLink(resolve(old, 'a'))
    noLink(resolve(root, 'bin/b'))
    t.ok(
      lstatSync(resolve(old, 'foreign')).isSymbolicLink(),
      'foreign',
    )
    t.equal(
      resolve(self, readlinkSync(resolve(self, 'a'))),
      target(realpathSync.native(root), 'a-ws', 'a', 'a.js'),
    )
    t.strictSame(readState(root), {
      binDirs: [old, self],
      pathSetup: 'declined',
    })
  })

  t.test('other bin dir failure tolerated', async t => {
    posix(t)
    const root = t.testdir({ old: { a: aLink('a.js') }, self: {} })
    const [old, self] = [binOf(root, 'old'), binOf(root, 'self')]
    writeFileSync(
      resolve(root, 'global-state.json'),
      JSON.stringify({ binDirs: [old] }),
    )
    removeFails = old
    const res = await linkGlobalBins(
      aGraph(root, { a: 'a.js' }),
      opts(root, false, { dir: self, source: 'self', inPath: true }),
    )
    t.strictSame(res.otherDirs, [])
    t.strictSame(res.bins, ['a'])
    t.ok(lstatSync(resolve(old, 'a')).isSymbolicLink())
  })

  t.test('malformed state', async t => {
    posix(t)
    const root = t.testdir({ 'global-state.json': '{' })
    await linkGlobalBins(mockGraph(root, {}), opts(root))
    t.strictSame(readState(root), { binDirs: [binOf(root)] })
  })

  t.test('global root via a dir symlink', async t => {
    posix(t)
    const dir = t.testdir({
      real: { bin: {} },
      link: t.fixture('symlink', 'real'),
    })
    const root = resolve(dir, 'link')
    const res = await linkGlobalBins(mockGraph(root, {}), opts(root))
    t.equal(res.binDir, binOf(dir, 'real/bin'))
    t.strictSame(res.otherDirs, [])
    t.strictSame(readState(root), {
      binDirs: [binOf(dir, 'real/bin')],
    })
  })

  for (const code of ['EACCES', 'EPERM']) {
    t.test(`self dir refuses writes, ${code}`, async t => {
      posix(t)
      const root = t.testdir({ self: {}, local: {} })
      const [self, local] = [
        binOf(root, 'self'),
        binOf(root, 'local'),
      ]
      symlinkFails = { dir: self, code }
      let fallbacks = 0
      const res = await linkGlobalBins(aGraph(root, { a: 'a.js' }), {
        ...opts(root, false, {
          dir: self,
          source: 'self',
          inPath: true,
        }),
        fallback: async () => {
          fallbacks++
          return {
            dir: local,
            source: 'local-bin',
            inPath: true,
            notWritable: self,
          }
        },
      })
      t.equal(fallbacks, 1)
      t.strictSame(res, {
        binDir: local,
        source: 'local-bin',
        bins: ['a'],
        conflicts: [],
        inPath: true,
        otherDirs: [],
        notWritable: self,
      })
      t.ok(lstatSync(resolve(local, 'a')).isSymbolicLink())
      noLink(resolve(self, 'a'))
      t.strictSame(readState(root), {
        binDirs: [local],
        localBinNoticed: true,
      })
    })
  }

  t.test('no fallback', async t => {
    posix(t)
    const root = t.testdir({ self: {} })
    const self = binOf(root, 'self')
    const fallback = async (): Promise<ResolvedGlobalBinDir> => {
      throw new Error('not called')
    }
    const graph = aGraph(root, { a: 'a.js' })
    symlinkFails = { dir: self, code: 'EACCES' }
    await t.rejects(
      linkGlobalBins(
        graph,
        opts(root, false, {
          dir: self,
          source: 'self',
          inPath: true,
        }),
      ),
      { code: 'EACCES' },
      'none given',
    )
    await t.rejects(
      linkGlobalBins(graph, {
        ...opts(root, false, { dir: self, source: 'config' }),
        fallback,
      }),
      { code: 'EACCES' },
      'not the self dir',
    )
    symlinkFails = { dir: self, code: 'EEXIST' }
    await t.rejects(
      linkGlobalBins(graph, {
        ...opts(root, false, {
          dir: self,
          source: 'self',
          inPath: true,
        }),
        fallback,
      }),
      { code: 'EEXIST' },
      'not a permission error',
    )
  })

  t.test('notWritable notices', async t => {
    posix(t)
    const root = t.testdir({ local: {} })
    const graph = aGraph(root, { a: 'a.js' })
    const local = opts(root, false, {
      dir: binOf(root, 'local'),
      source: 'local-bin',
      inPath: true,
      notWritable: '/self',
    })
    t.equal((await linkGlobalBins(graph, local)).notWritable, '/self')
    t.equal(
      (await linkGlobalBins(graph, local)).notWritable,
      undefined,
      'local-bin once',
    )
    t.match(readState(root), { localBinNoticed: true })
    const g = opts(root, false, { notWritable: '/self' })
    t.equal((await linkGlobalBins(graph, g)).notWritable, '/self')
    t.equal(
      (await linkGlobalBins(graph, g)).notWritable,
      '/self',
      'global-dir every run',
    )
    t.match(readState(root), { localBinNoticed: true })
  })

  t.test('no notice when nothing linked', async t => {
    posix(t)
    const root = t.testdir({ local: {} })
    const graph = mockGraph(root, {})
    const local = opts(root, false, {
      dir: binOf(root, 'local'),
      source: 'local-bin',
      inPath: true,
      notWritable: '/self',
    })
    t.equal(
      (await linkGlobalBins(graph, local)).notWritable,
      undefined,
    )
    t.notMatch(
      readState(root),
      { localBinNoticed: true },
      'not used up',
    )
    const g = opts(root, false, { notWritable: '/self' })
    t.equal((await linkGlobalBins(graph, g)).notWritable, undefined)
  })

  t.test('state write failure is not a link error', async t => {
    posix(t)
    const root = t.testdir({ self: {} })
    const self = binOf(root, 'self')
    renameFails = {
      path: resolve(root, 'global-state.json'),
      code: 'EPERM',
    }
    await t.rejects(
      linkGlobalBins(aGraph(root, { a: 'a.js' }), {
        ...opts(root, false, {
          dir: self,
          source: 'self',
          inPath: true,
        }),
        fallback: async () => {
          throw new Error('not called')
        },
      }),
      { code: 'EPERM' },
    )
    t.ok(lstatSync(resolve(self, 'a')).isSymbolicLink(), 'link kept')
  })

  t.test('non-Error rejection is rethrown', async t => {
    posix(t)
    const root = t.testdir({ self: {} })
    const self = binOf(root, 'self')
    symlinkFails = { dir: self, code: 'EACCES', notError: true }
    await t.rejects(
      linkGlobalBins(aGraph(root, { a: 'a.js' }), {
        ...opts(root, false, {
          dir: self,
          source: 'self',
          inPath: true,
        }),
        fallback: async () => {
          throw new Error('not called')
        },
      }),
      { code: 'EACCES' },
    )
  })

  t.test('created shims removed on rollback, win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const root = t.testdir({
      packages: {
        'a-ws': {
          node_modules: { a: { 'a.js': '', 'b.js': '' } },
        },
      },
    })
    shimFails = 1
    await t.rejects(
      linkGlobalBins(
        aGraph(root, { a: 'a.js', b: 'b.js' }),
        opts(root),
      ),
      { code: 'EIO' },
    )
    t.equal(shims.length, 2)
    for (const f of ['a', 'a.cmd', 'b', 'b.cmd']) {
      t.notOk(existsSync(resolve(binOf(root), f)), f)
    }
  })

  t.test(
    'global root via a dir symlink, relative old links',
    async t => {
      posix(t)
      const dir = t.testdir({
        real: {
          bin: {
            a: t.fixture(
              'symlink',
              '../packages/a-ws/node_modules/a/old.js',
            ),
          },
          packages: {
            'a-ws': { node_modules: { a: { 'a.js': '' } } },
          },
        },
        link: t.fixture('symlink', 'real'),
      })
      const root = resolve(dir, 'link')
      const res = await linkGlobalBins(
        aGraph(root, { a: 'a.js' }),
        opts(root),
      )
      t.strictSame(res.bins, ['a'], 'old link owned')
      t.strictSame(res.conflicts, [])
      t.equal(
        readlinkSync(resolve(dir, 'real/bin/a')),
        join('..', 'packages', 'a-ws', 'node_modules', 'a', 'a.js'),
        'short, canonical',
      )
    },
  )

  t.test('created links removed on rollback', async t => {
    posix(t)
    const root = t.testdir()
    symlinkFails = { dir: binOf(root), code: 'EIO', after: 1 }
    await t.rejects(
      linkGlobalBins(
        aGraph(root, { a: 'a.js', b: 'b.js' }),
        opts(root),
      ),
      { code: 'EIO' },
    )
    noLink(resolve(binOf(root), 'a'))
    noLink(resolve(binOf(root), 'b'))
    t.equal(removers[0]?.rolledBack, true)
  })

  t.test('symlinked PATH entry (fnm)', async t => {
    posix(t)
    const root = t.testdir({
      real: { bin: {} },
      shell: t.fixture('symlink', 'real'),
      packages: {
        'a-ws': { node_modules: { a: { 'a.js': '' } } },
      },
    })
    const dir = realpathSync.native(resolve(root, 'shell/bin'))
    t.equal(dir, binOf(root, 'real/bin'))
    await linkGlobalBins(
      aGraph(root, { a: 'a.js' }),
      opts(root, false, { dir, source: 'self', inPath: true }),
    )
    const want = realpathSync.native(
      target(root, 'a-ws', 'a', 'a.js'),
    )
    t.equal(realpathSync.native(resolve(root, 'real/bin/a')), want)
    t.equal(realpathSync.native(resolve(root, 'shell/bin/a')), want)
    t.strictSame(
      await unlinkGlobalBins(dir, [resolve(root, 'packages')]),
      ['a'],
    )
  })
})

t.test('unlinkGlobalBins', async t => {
  t.test('missing bin dir', async t => {
    t.strictSame(
      await unlinkGlobalBins(resolve(t.testdir(), 'bin'), ['/x']),
      [],
    )
  })

  t.test('removes owned links and their shims', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const root = t.testdir({
      bin: {
        b: t.fixture('symlink', '../packages/a-ws/b.js'),
        'b.cmd': 'shim',
        'b.ps1': 'shim',
        'b.pwsh': 'shim',
        a: t.fixture('symlink', '../packages/a-ws/a.js'),
        other: t.fixture('symlink', '../elsewhere/x.js'),
        'packages.cmd': 'not a shim',
      },
    })
    const removed = await unlinkGlobalBins(resolve(root, 'bin'), [
      resolve(root, 'packages/a-ws'),
    ])
    t.strictSame(removed, ['a', 'b'])
    for (const f of ['a', 'b', 'b.cmd', 'b.ps1', 'b.pwsh']) {
      t.notOk(existsSync(resolve(root, 'bin', f)), f)
    }
    t.ok(lstatSync(resolve(root, 'bin/other')).isSymbolicLink())
    t.ok(existsSync(resolve(root, 'bin/packages.cmd')))
  })

  t.test('never reads plain files', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        node: 'a big binary',
        a: t.fixture('symlink', '../packages/a-ws/a.js'),
        'x.cmd': 'shim',
      },
    })
    await unlinkGlobalBins(resolve(root, 'bin'), [resolve(root, 'x')])
    t.strictSame(inspected.sort(), [
      resolve(root, 'bin/a'),
      resolve(root, 'bin/x'),
    ])
  })
})

t.test('removeGlobalWorkspaces / removeGlobalPackages', async t => {
  posix(t)
  const root = t.testdir({
    bin: {
      a: t.fixture('symlink', '../packages/a-ws/a.js'),
      b: t.fixture('symlink', '../packages/b-ws/b.js'),
    },
    packages: {
      'a-ws': { 'package.json': '{}' },
      'b-ws': { 'package.json': '{}' },
      'c-ws': { 'package.json': '{}' },
    },
  })
  const ws = (d: string) => resolve(root, 'packages', d)
  await removeGlobalPackages(root, [ws('a-ws')])
  t.notOk(existsSync(ws('a-ws')))
  t.throws(() => lstatSync(resolve(root, 'bin/a')))
  t.ok(lstatSync(resolve(root, 'bin/b')).isSymbolicLink())
  await removeGlobalWorkspaces([ws('b-ws'), ws('c-ws')])
  t.notOk(existsSync(ws('b-ws')))
  t.notOk(existsSync(ws('c-ws')))

  t.test('all recorded bin dirs', async t => {
    const a = t.fixture('symlink', '../packages/a-ws/a.js')
    const root = t.testdir({
      cur: { a },
      old: { a },
      bad: { a },
      bin: { a },
      packages: { 'a-ws': { 'package.json': '{}' } },
    })
    const [old, bad] = [binOf(root, 'old'), binOf(root, 'bad')]
    writeFileSync(
      resolve(root, 'global-state.json'),
      JSON.stringify({ binDirs: [old, bad] }),
    )
    rmFails = bad
    await removeGlobalPackages(
      root,
      [resolve(root, 'packages/a-ws')],
      binOf(root, 'cur'),
    )
    for (const d of ['cur', 'old', 'bin']) {
      t.throws(() => lstatSync(resolve(root, d, 'a')), d)
    }
    t.ok(
      lstatSync(resolve(bad, 'a')).isSymbolicLink(),
      'failure tolerated',
    )
    t.notOk(existsSync(resolve(root, 'packages/a-ws')))
  })
})

t.test('isInPath', async t => {
  const dir = resolve('/x/bin')
  t.equal(isInPath(dir, ['', '/y', `${dir}/`].join(delimiter)), true)
  t.equal(isInPath(dir, ['', '/y'].join(delimiter)), false)
  t.equal(isInPath(dir, ''), false)

  t.test('defaults to process.env.PATH', async t => {
    setPath(t, dir)
    t.equal(isInPath(dir), true)
  })

  t.test('no PATH', async t => {
    setPath(t)
    t.equal(isInPath(dir), false)
  })

  t.test('case-insensitive on win32', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    t.equal(isInPath(dir, dir.toUpperCase()), true)
  })
})

t.test('globalBinsLines', async t => {
  const dir = '/h/me/.local/share/vlt/global/bin'
  const g = (o: Partial<GlobalBins> = {}): GlobalBins => ({
    binDir: dir,
    source: 'global-dir',
    bins: ['a', 'b'],
    conflicts: ['c'],
    inPath: false,
    otherDirs: [],
    ...o,
  })
  const o = { home: '/h/me', platform: 'linux', env: {} } as const
  const pretty = '~/.local/share/vlt/global/bin'
  t.strictSame(
    globalBinsLines(g({ notWritable: '/usr/bin' }), {
      ...o,
      shell: 'zsh',
    }),
    [
      `ℹ️  Using ${pretty} because /usr/bin is not writable.`,
      `🔗 Linked a, b in ${pretty}`,
      `⚠️  Skipped c: already in ${pretty} (use --force to overwrite)`,
      '',
      `⚠️  ${pretty} is not on your PATH, so a, b can't be run yet.`,
      '   Run `vlt setup --path` to add it, or add this line to ~/.zshrc:',
      '     export PATH="$HOME/.local/share/vlt/global/bin:$PATH"',
    ],
  )
  t.strictSame(
    globalBinsLines(g({ bins: [], notWritable: '/h/me/bin' }), {
      ...o,
      shell: 'fish',
    }),
    [
      `ℹ️  Using ${pretty} because ~/bin is not writable.`,
      `⚠️  Skipped c: already in ${pretty} (use --force to overwrite)`,
      '',
      `⚠️  ${pretty} is not on your PATH, so global bins can't be run yet.`,
      '   Run `vlt setup --path` to add it, or run:',
      '     fish_add_path "$HOME/.local/share/vlt/global/bin"',
    ],
  )
  t.strictSame(
    globalBinsLines(g({ conflicts: [], inPath: true }), o),
    [`🔗 Linked a, b in ${pretty}`],
    'in PATH',
  )
  t.strictSame(
    globalBinsLines(g({ bins: [], conflicts: [] }), o),
    [],
    'nothing linked',
  )

  t.test('symlinked home', async t => {
    const d = t.testdir({
      real: { bin: {} },
      link: t.fixture('symlink', 'real'),
    })
    const lines = globalBinsLines(
      g({ binDir: binOf(d, 'real/bin'), bins: ['a'], conflicts: [] }),
      { home: resolve(d, 'link'), env: {}, shell: 'bash' },
    )
    t.equal(lines[0], `🔗 Linked a in ~${sep}bin`)
    t.equal(lines.at(-1), '     export PATH="$HOME/bin:$PATH"')
  })

  t.test('missing home', async t => {
    t.equal(
      globalBinsLines(g(), { ...o, home: '/no/such/home' })[0],
      `🔗 Linked a, b in ${dir}`,
    )
  })

  t.test('platform from opts', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(
      globalBinsLines(g({ binDir: 'C:\\Users\\me\\bin' }), {
        home: 'C:\\Users\\me',
        platform: 'win32',
        env: {},
        shell: 'cmd',
      })[0],
      '🔗 Linked a, b in ~\\bin',
    )
  })

  t.test('detects the shell', async t => {
    t.intercept(process, 'platform', { value: 'linux' })
    t.intercept(process, 'env', { value: { SHELL: '/bin/bash' } })
    const home = t.testdir({ '.bashrc': '' })
    t.strictSame(
      globalBinsLines(g({ conflicts: [] }), { home }).slice(-2),
      [
        '   Run `vlt setup --path` to add it, or add this line to ~/.bashrc:',
        `     export PATH="${dir}:$PATH"`,
      ],
    )
    t.strictSame(
      globalBinsLines(g({ conflicts: [], inPath: true })),
      [`🔗 Linked a, b in ${dir}`],
      'default home',
    )
  })

  t.test('no vlt setup --path', async t => {
    for (const [shell, platform] of [
      ['nu', 'linux'],
      ['bash', 'win32'],
    ] as const) {
      t.match(
        globalBinsLines(g({ conflicts: [] }), {
          ...o,
          shell,
          platform,
        })[3],
        /^ {3}Set --global-bin-dir to a folder on your PATH, or /,
        `${shell} ${platform}`,
      )
    }
  })
})
