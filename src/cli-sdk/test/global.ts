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
  writeFileSync,
} from 'node:fs'
import { rm } from 'node:fs/promises'
import { delimiter, resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

const removers: MockRemover[] = []
class MockRemover {
  removed: string[] = []
  confirmed = false
  rolledBack = false
  constructor() {
    removers.push(this)
  }
  // like RollbackRemove, a path is only moved aside once
  async rm(path: string) {
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
const mockShim = async (from: string, to: string) => {
  shims.push([from, to])
  writeFileSync(to + '.cmd', from)
}

const {
  assertGlobalOptions,
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
    options: { projectRoot, packageInfo: { manifest } },
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
    const foo = resolve(root, 'packages/foo-global-ws')
    const bar = resolve(root, 'packages/@s+bar-global-ws')
    t.strictSame(created, [foo, bar])
    t.strictSame(readJSON(resolve(foo, 'package.json')), {
      name: 'foo-global-ws',
      private: true,
    })
    t.strictSame(readJSON(resolve(bar, 'package.json')), {
      name: '@s/bar-global-ws',
      private: true,
    })
    t.equal(add.modifiedDependencies, true)
    t.equal(wsId('foo-global-ws'), 'workspace~packages+foo-global-ws')
    t.strictSame(
      [...add.keys()],
      [wsId('foo-global-ws'), wsId('@s+bar-global-ws')],
    )
    const dep = add.get(wsId('foo-global-ws'))?.get('foo')
    t.equal(dep?.type, 'implicit')
    t.equal(String(dep?.spec), 'foo@1')
    t.equal(
      String(add.get(wsId('@s+bar-global-ws'))?.get('@s/bar')?.spec),
      '@s/bar@',
    )
    t.strictSame(
      importers,
      new Set([wsId('foo-global-ws'), wsId('@s+bar-global-ws')]),
    )
    t.strictSame(resets, [root], 'options reset once')

    // existing workspace is reused
    const again = mockConf(root, ['foo@2'])
    const res = await parseGlobalAddArgs(again.conf)
    t.strictSame(res.created, [])
    t.strictSame(again.resets, [], 'no reset')
    t.equal(
      String(res.add.get(wsId('foo-global-ws'))?.get('foo')?.spec),
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
    const spec = add.get(wsId('tool-global-ws'))?.get('tool')?.spec
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
    t.equal(
      add.get(wsId('abs-global-ws'))?.get('abs')?.spec.type,
      'file',
    )
    t.equal(
      String(add.get(wsId('b-global-ws'))?.get('b')?.spec),
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
    t.notOk(existsSync(resolve(root, '../evil-global-ws')))
  })

  t.test('created workspaces removed on error', async t => {
    const root = t.testdir({ packages: {} })
    const { conf } = mockConf(root, ['foo', 'nope:bar@1'])
    await t.rejects(parseGlobalAddArgs(conf))
    t.notOk(existsSync(resolve(root, 'packages/foo-global-ws')))
  })
})

t.test('parseGlobalRemoveArgs', async t => {
  const root = t.testdir({
    packages: {
      'foo-global-ws': { 'package.json': '{}' },
      '@s+bar-global-ws': { 'package.json': '{}' },
    },
  })
  const { remove, dirs } = parseGlobalRemoveArgs(
    mockConf(root, ['foo', '@s/bar', 'foo']).conf,
  )
  t.equal(remove.modifiedDependencies, true)
  t.strictSame(
    remove,
    new Map([
      [wsId('foo-global-ws'), new Set(['foo'])],
      [wsId('@s+bar-global-ws'), new Set(['@s/bar'])],
    ]),
  )
  t.strictSame(dirs, [
    resolve(root, 'packages/foo-global-ws'),
    resolve(root, 'packages/@s+bar-global-ws'),
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

const opts = (projectRoot: string, force = false) => ({
  projectRoot,
  scurry: new PathScurry(projectRoot),
  force,
})

const target = (root: string, ws: string, dep: string, p: string) =>
  resolve(root, 'packages', ws, 'node_modules', dep, p)

const linkTarget = (root: string, bin: string) =>
  resolve(root, 'bin', readlinkSync(resolve(root, 'bin', bin)))

t.test('linkGlobalBins', async t => {
  t.beforeEach(() => {
    removers.length = 0
    shims.length = 0
  })

  t.test('links bins of targeted workspaces', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        // stale bin of a targeted ws
        old: t.fixture(
          'symlink',
          '../packages/a-global-ws/node_modules/a/old.js',
        ),
        // bin owned by another ws
        other: t.fixture(
          'symlink',
          '../packages/c-global-ws/node_modules/c/c.js',
        ),
        // name taken by another ws
        dup: t.fixture(
          'symlink',
          '../packages/c-global-ws/node_modules/c/dup.js',
        ),
        // foreign file
        foreign: 'not a link',
      },
      packages: {},
    })
    const graph = mockGraph(root, {
      'b-global-ws': {
        b: { bins: { b: 'b.js', foreign: 'f.js' } },
        none: {},
        missing: undefined,
      },
      'a-global-ws': {
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
      'c-global-ws': { c: { bins: { other: 'c.js' } } },
    })
    const res = await linkGlobalBins(
      graph,
      opts(root),
      new Set([wsId('a-global-ws'), wsId('b-global-ws')]),
    )
    t.strictSame(res, {
      binDir: resolve(root, 'bin'),
      bins: ['a', 'b'],
      conflicts: ['dup', 'foreign'],
      inPath: false,
    })
    t.equal(
      linkTarget(root, 'a'),
      target(root, 'a-global-ws', 'a', 'bin/a.js'),
    )
    t.equal(
      linkTarget(root, 'b'),
      target(root, 'b-global-ws', 'b', 'b.js'),
    )
    t.equal(
      linkTarget(root, 'other'),
      target(root, 'c-global-ws', 'c', 'c.js'),
      'not targeted, untouched',
    )
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'c-global-ws', 'c', 'dup.js'),
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
    await linkGlobalBins(
      graph,
      opts(root),
      new Set([wsId('a-global-ws')]),
    )
    t.equal(
      linkTarget(root, 'a'),
      target(root, 'a-global-ws', 'a', 'bin/a.js'),
    )
  })

  t.test('--force overwrites conflicts', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        dup: t.fixture(
          'symlink',
          '../packages/c-global-ws/node_modules/c/dup.js',
        ),
        foreign: 'not a link',
      },
    })
    const graph = mockGraph(root, {
      'a-global-ws': {
        a: { bins: { dup: 'dup.js', foreign: 'f.js' } },
      },
      'b-global-ws': { b: { bins: { dup: 'dup.js' } } },
    })
    const res = await linkGlobalBins(graph, opts(root, true))
    t.strictSame(res.bins, ['dup', 'foreign'])
    t.strictSame(res.conflicts, [])
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'b-global-ws', 'b', 'dup.js'),
      'last one wins',
    )
    t.equal(
      linkTarget(root, 'foreign'),
      target(root, 'a-global-ws', 'a', 'f.js'),
    )
  })

  t.test('full resync relinks all workspaces', async t => {
    posix(t)
    const root = t.testdir({
      bin: {
        // owned by c, which is relinked first now
        dup: t.fixture(
          'symlink',
          '../packages/c-global-ws/node_modules/c/dup.js',
        ),
        gone: t.fixture(
          'symlink',
          '../packages/gone-global-ws/node_modules/gone/x.js',
        ),
      },
    })
    const graph = mockGraph(root, {
      'c-global-ws': { c: { bins: { dup: 'dup.js', c: 'c.js' } } },
      'a-global-ws': { a: { bins: { dup: 'dup.js' } } },
    })
    const res = await linkGlobalBins(graph, opts(root))
    t.strictSame(res.bins, ['c', 'dup'])
    t.strictSame(res.conflicts, ['dup'])
    t.equal(
      linkTarget(root, 'dup'),
      target(root, 'a-global-ws', 'a', 'dup.js'),
      'sorted by ws path, first wins',
    )
    t.notOk(existsSync(resolve(root, 'bin/gone')))
  })

  t.test('inPath', async t => {
    posix(t)
    const root = t.testdir()
    setPath(t, resolve(root, 'bin'))
    const res = await linkGlobalBins(mockGraph(root, {}), opts(root))
    t.strictSame(res, {
      binDir: resolve(root, 'bin'),
      bins: [],
      conflicts: [],
      inPath: true,
    })
  })

  t.test('win32 shims', async t => {
    t.intercept(process, 'platform', { value: 'win32' })
    const root = t.testdir({ bin: { 'taken.ps1': 'foreign' } })
    const graph = mockGraph(root, {
      'a-global-ws': { a: { bins: { a: 'a.js', taken: 't.js' } } },
    })
    const res = await linkGlobalBins(graph, opts(root))
    t.strictSame(res.bins, ['a'])
    t.strictSame(res.conflicts, ['taken'])
    t.strictSame(shims, [
      [
        target(root, 'a-global-ws', 'a', 'a.js'),
        resolve(root, 'bin/a'),
      ],
    ])
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
        b: t.fixture('symlink', '../packages/a-global-ws/b.js'),
        'b.cmd': 'shim',
        'b.ps1': 'shim',
        'b.pwsh': 'shim',
        a: t.fixture('symlink', '../packages/a-global-ws/a.js'),
        other: t.fixture('symlink', '../elsewhere/x.js'),
        'packages.cmd': 'not a shim',
      },
    })
    const removed = await unlinkGlobalBins(resolve(root, 'bin'), [
      resolve(root, 'packages/a-global-ws'),
    ])
    t.strictSame(removed, ['a', 'b'])
    for (const f of ['a', 'b', 'b.cmd', 'b.ps1', 'b.pwsh']) {
      t.notOk(existsSync(resolve(root, 'bin', f)), f)
    }
    t.ok(lstatSync(resolve(root, 'bin/other')).isSymbolicLink())
    t.ok(existsSync(resolve(root, 'bin/packages.cmd')))
  })
})

t.test('removeGlobalWorkspaces / removeGlobalPackages', async t => {
  posix(t)
  const root = t.testdir({
    bin: {
      a: t.fixture('symlink', '../packages/a-global-ws/a.js'),
      b: t.fixture('symlink', '../packages/b-global-ws/b.js'),
    },
    packages: {
      'a-global-ws': { 'package.json': '{}' },
      'b-global-ws': { 'package.json': '{}' },
      'c-global-ws': { 'package.json': '{}' },
    },
  })
  const ws = (d: string) => resolve(root, 'packages', d)
  await removeGlobalPackages(root, [ws('a-global-ws')])
  t.notOk(existsSync(ws('a-global-ws')))
  t.throws(() => lstatSync(resolve(root, 'bin/a')))
  t.ok(lstatSync(resolve(root, 'bin/b')).isSymbolicLink())
  await removeGlobalWorkspaces([ws('b-global-ws'), ws('c-global-ws')])
  t.notOk(existsSync(ws('b-global-ws')))
  t.notOk(existsSync(ws('c-global-ws')))
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
