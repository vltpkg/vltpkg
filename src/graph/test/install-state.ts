import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { asDependency } from '../src/dependencies.ts'
import type { AddImportersDependenciesMap } from '../src/dependencies.ts'
import type { Diff } from '../src/diff.ts'
import { Graph } from '../src/graph.ts'
import type { InstallStateOptions } from '../src/install-state.ts'
import type {
  LockfileData,
  LockfileNode,
} from '../src/lockfile/types.ts'

let modifiers: Record<string, string> | undefined
const fsReads: string[] = []
const fs = await import('node:fs')
const { detachLinks, removeInstallState, startInstallState } =
  await t.mockImport<typeof import('../src/install-state.ts')>(
    '../src/install-state.ts',
    {
      '@vltpkg/vlt-json': { load: () => modifiers },
      'node:fs': {
        ...fs,
        readFileSync: (path: string, enc?: BufferEncoding) => {
          fsReads.push(path)
          return fs.readFileSync(path, enc)
        },
      },
    },
  )

const a = joinDepIDTuple(['registry', '', 'a@1.0.0'])
const b = joinDepIDTuple(['registry', '', 'b@1.0.0'])
const opt = joinDepIDTuple(['registry', '', 'opt@2.0.0'])
const gitOpt = joinDepIDTuple(['git', 'github:x/y', 'main'])
const localId = joinDepIDTuple(['file', 'local'])
const stateFile = 'node_modules/.vlt/state.json'
const old = new Date('2020-01-01T00:00:00Z')

const lockfile = (
  nodes: Record<string, LockfileNode>,
): LockfileData => ({
  lockfileVersion: 0,
  options: {},
  nodes: nodes,
  edges: {},
})

const setup = (t: Test, extra: Record<string, unknown> = {}) => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'root',
      version: '1.0.0',
      dependencies: { a: '1', b: '1' },
    }),
    'vlt.json': '{}',
    'vlt-lock.json': '{"nodes":{}}',
    node_modules: {
      '.vlt-lock.json': '{"nodes":{}}',
      '.vlt': {
        [a]: { node_modules: { a: {} } },
        [b]: { node_modules: { b: {} } },
      },
      a: t.fixture('symlink', `.vlt/${a}/node_modules/a`),
      b: t.fixture('symlink', `.vlt/${b}/node_modules/b`),
    },
    ...extra,
  })
  // as if each install ran in a new process, after the fixture was made
  t.intercept(performance, 'timeOrigin', {
    get: () => Date.now() + 1000,
  })
  modifiers = undefined
  const graph = new Graph({
    projectRoot,
    mainManifest: { name: 'root', version: '1.0.0' },
  })
  for (const name of ['a', 'b']) {
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse(name, '1'),
      { name, version: '1.0.0' },
    )
  }
  const options: InstallStateOptions = {
    projectRoot,
    upToDateCheck: true,
  }
  const path = (p: string) => resolve(projectRoot, p)
  const state = () =>
    JSON.parse(readFileSync(path(stateFile), 'utf8')) as {
      inputs: [string, string[] | null, string?, 1?][]
      tree: [string, string][]
      buildQueue: DepID[]
      add: string[][]
      nodes: number
      hidden: string[]
    }
  // what a reifying install of `graph` hands over
  const record = (
    o: InstallStateOptions = options,
    hidden: LockfileData | null = lockfile({
      [a]: [0, 'a', null, null, null, null, null, null, null, 1],
      [b]: [0, 'b'],
    }),
    data: LockfileData = lockfile({
      [a]: [0, 'a'],
      [b]: [0, 'b'],
      [opt]: [1, 'opt'],
      [gitOpt]: [1, null],
    }),
  ) => {
    const { state } = startInstallState(o)
    state?.setReplay(graph, data, hidden ?? undefined, false)
    state?.save(graph)
    return state
  }
  // a later install's view of the same project
  const start = (o: InstallStateOptions = options) =>
    startInstallState(o)
  // ages the inputs, so that their stamps are trusted
  const age = () => {
    for (const f of ['package.json', 'vlt.json', 'vlt-lock.json']) {
      utimesSync(path(f), old, old)
    }
  }
  return {
    projectRoot,
    graph,
    options,
    path,
    state,
    record,
    start,
    age,
  }
}

t.test('a recorded tree is up to date', async t => {
  const { record, start, state, path, age } = setup(t)
  age()
  record()
  const s = state()
  t.strictSame(
    s.tree,
    [
      ['.', 'a'],
      ['.', 'b'],
    ],
    'importer links',
  )
  t.strictSame(
    s.inputs.map(([p, st]) => [p, !!st]),
    [
      ['package.json', true],
      ['vlt.json', true],
      ['vlt-lock.json', true],
      ['pnpm-workspace.yaml', false],
    ],
  )
  t.strictSame(
    s.inputs.map(i => i[3]),
    [undefined, undefined, undefined, undefined],
    'aged inputs are not racy',
  )
  t.strictSame(
    s.add,
    [['opt', '2.0.0'], [gitOpt]],
    'locked optional nodes left out',
  )
  t.strictSame(s.buildQueue, [a], 'pending builds')
  t.equal(s.nodes, 5, 'importers + locked nodes')

  fsReads.length = 0
  const res = start()
  t.strictSame(res.hit, {
    buildQueue: [a],
    upToDate: { nodes: 5, add: [['opt', '2.0.0'], [gitOpt]] },
  })
  t.strictSame(
    fsReads,
    [path(stateFile)],
    'only the state is read on a stamp hit',
  )
})

t.test('an input rewritten as is stays up to date', async t => {
  const { record, start, state, path, age } = setup(t)
  age()
  record()
  const before = state().inputs[0]
  const pj = readFileSync(path('package.json'))
  // eg `npm pkg delete packageManager` w/o one
  writeFileSync(path('package.json'), pj)
  fsReads.length = 0
  t.ok(start().hit, 'content check keeps the hit')
  t.ok(
    fsReads.includes(path('package.json')),
    'the drifted input was read',
  )
  const after = state().inputs[0]
  t.not(after?.[1]?.[1], before?.[1]?.[1], 'stamp refreshed')
  t.equal(after?.[2], before?.[2], 'same hash')
  t.equal(after?.[3], 1, 'just written: racy')
  // still racy: checked again, nothing to rewrite
  t.ok(start().hit)
  utimesSync(path('package.json'), old, old)
  t.ok(start().hit)
  t.equal(state().inputs[0]?.[3], undefined, 'old enough: trusted')
  fsReads.length = 0
  t.ok(start().hit)
  t.notOk(fsReads.includes(path('package.json')), 'stamp hit')
})

t.test('changed inputs are a miss', async t => {
  const cases: [string, (p: (f: string) => string) => void][] = [
    [
      'root manifest',
      p =>
        writeFileSync(
          p('package.json'),
          JSON.stringify({ name: 'root', version: '1.0.1' }),
        ),
    ],
    ['vlt.json', p => writeFileSync(p('vlt.json'), '{"x":1}')],
    ['vlt.json removed', p => rmSync(p('vlt.json'))],
    ['lockfile', p => writeFileSync(p('vlt-lock.json'), '{}')],
    [
      'pnpm-workspace.yaml added',
      p => writeFileSync(p('pnpm-workspace.yaml'), 'packages: []'),
    ],
    [
      // never hashed: a new stamp is enough
      'hidden lockfile touched',
      p => utimesSync(p('node_modules/.vlt-lock.json'), old, old),
    ],
    [
      'state version',
      p => {
        const s = JSON.parse(readFileSync(p(stateFile), 'utf8')) as {
          v: number
        }
        writeFileSync(p(stateFile), JSON.stringify({ ...s, v: 0 }))
      },
    ],
    [
      'vlt version',
      p => {
        const s = JSON.parse(readFileSync(p(stateFile), 'utf8')) as {
          vlt: string
        }
        writeFileSync(
          p(stateFile),
          JSON.stringify({ ...s, vlt: '0.0.0' }),
        )
      },
    ],
    ['corrupt state', p => writeFileSync(p(stateFile), '{')],
  ]
  for (const [name, change] of cases) {
    await t.test(name, async t => {
      const { record, start, path, age } = setup(t)
      age()
      record()
      change(path)
      const res = start()
      t.notOk(res.hit, 'miss')
      t.strictSame(res.links, [])
      t.notOk(existsSync(path(stateFile)), 'state removed')
    })
  }
})

t.test('tree-affecting config', async t => {
  const { record, start, options, age } = setup(t)
  age()
  const config = {
    ...options,
    registries: { npm: 'https://a/', b: 'https://b/' },
    catalogs: { z: { x: '1' }, a: { y: '2', b: '1', c: '3' } },
    os: ['linux', 'darwin'],
    before: new Date('2024-01-01'),
    'scoped-registries': Object.assign(Object.create(null), {
      '@x': 'https://x/',
    }) as Record<string, string>,
  }
  record(config)
  t.ok(
    start({
      ...config,
      registries: { b: 'https://b/', npm: 'https://a/' },
    }).hit,
    'key order does not matter',
  )
  t.notOk(
    start({ ...config, os: ['darwin'] }).hit,
    'a changed value is a miss',
  )
  record(config)
  t.notOk(start({ ...config, catalogs: {} }).hit)
  record(config)
  t.notOk(
    start({ ...config, before: new Date('2024-01-02') }).hit,
    'dates compare by value',
  )
  record(config)
  t.intercept(process, 'version', { value: 'v0.0.0' })
  t.notOk(start(config).hit, 'another node version')
})

t.test('workspaces and file deps', async t => {
  const { projectRoot, graph, record, start, path, state, age } =
    setup(t, {
      'vlt.json': JSON.stringify({ workspaces: 'packages/*' }),
      packages: {
        w: {
          'package.json': JSON.stringify({
            name: 'w',
            version: '1.0.0',
          }),
        },
      },
      local: {
        'package.json': JSON.stringify({ name: 'local' }),
      },
    })
  age()
  const loadMonorepo = () =>
    Monorepo.load(projectRoot, {
      config: { packages: ['packages/*'] },
      load: {},
    })
  const local = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('local', 'file:./local'),
    { name: 'local' },
    localId,
  )
  // a file dep that is a workspace dir is recorded once
  const w = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('w', 'file:./packages/w'),
    { name: 'w', version: '1.0.0' },
    joinDepIDTuple(['file', 'packages/w']),
  )
  if (!local || !w) throw new Error('no file nodes')
  local.location = './local'
  w.location = './packages/w'
  // linked by reify
  symlinkSync('../local', path('node_modules/local'), 'junction')
  symlinkSync('../packages/w', path('node_modules/w'), 'junction')
  const o = {
    projectRoot,
    upToDateCheck: true,
    monorepo: loadMonorepo(),
    fullMonorepo: loadMonorepo(),
  }
  record(o)
  t.strictSame(
    state().inputs.map(([p]) => p.replaceAll('\\', '/')),
    [
      'package.json',
      'packages/w/package.json',
      'vlt.json',
      'vlt-lock.json',
      'pnpm-workspace.yaml',
      'local/package.json',
    ],
  )
  t.ok(start(o).hit)

  writeFileSync(path('local/package.json'), '{"name":"local","x":1}')
  t.notOk(start(o).hit, 'a file dep manifest is an input')

  record(o)
  mkdirSync(path('packages/v'))
  writeFileSync(path('packages/v/package.json'), '{"name":"v"}')
  const more = loadMonorepo()
  t.notOk(
    start({ ...o, monorepo: more, fullMonorepo: more }).hit,
    'a new workspace',
  )
})

t.test('the tree', async t => {
  await t.test('lost links are reported', async t => {
    const { record, start, path, age } = setup(t)
    age()
    record()
    rmSync(path('node_modules/a'))
    // replaced by a dir: no link either
    rmSync(path('node_modules/b'))
    mkdirSync(path('node_modules/b'))
    const res = start()
    t.notOk(res.hit)
    t.strictSame(res.links, [
      ['.', 'a'],
      ['.', 'b'],
    ])
    t.notOk(existsSync(path(stateFile)), 'state removed')
  })

  await t.test('a moved node_modules is a miss', async t => {
    const { record, start, path, projectRoot, age } = setup(t)
    age()
    record()
    renameSync(path('node_modules'), path('nm'))
    symlinkSync(
      resolve(projectRoot, 'nm'),
      path('node_modules'),
      'junction',
    )
    const res = start()
    t.notOk(res.hit)
    t.strictSame(res.links, [])
    t.notOk(existsSync(path(stateFile)), 'state removed')
    record()
    t.notOk(existsSync(path(stateFile)), 'never recorded')
  })

  await t.test('a lost link is never recorded', async t => {
    const { record, path, age } = setup(t)
    age()
    rmSync(path('node_modules/b'))
    record()
    t.notOk(existsSync(path(stateFile)))
  })

  await t.test('no store, no state', async t => {
    const { record, path, age } = setup(t)
    age()
    rmSync(path('node_modules/.vlt'), { recursive: true })
    record()
    t.notOk(existsSync(path(stateFile)))
  })

  await t.test('no hidden lockfile, no state', async t => {
    const { record, path, age } = setup(t)
    age()
    rmSync(path('node_modules/.vlt-lock.json'))
    record()
    t.notOk(existsSync(path(stateFile)))
  })

  await t.test('importer edges w/o a placed target', async t => {
    const { record, graph, path, state, age } = setup(t)
    age()
    // missing dep
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('c', '1'),
    )
    // a node not in the graph any more
    const gone = graph.placePackage(
      graph.mainImporter,
      'optional',
      Spec.parse('opt', '2'),
      { name: 'opt', version: '2.0.0' },
    )
    if (!gone) throw new Error('no node')
    graph.nodes.delete(gone.id)
    record()
    t.ok(existsSync(path(stateFile)))
    t.strictSame(state().tree, [
      ['.', 'a'],
      ['.', 'b'],
    ])
  })
})

t.test('detachLinks', async t => {
  const { graph } = setup(t)
  const node = graph.nodes.get(a)
  const edge = graph.mainImporter.edgesOut.get('a')
  if (!node || !edge) throw new Error('no node')
  const other = graph.placePackage(
    node,
    'prod',
    Spec.parse('a', '1'),
    { name: 'a', version: '1.0.0' },
  )
  t.equal(other, node, 'a second edge into a')
  detachLinks(graph, [
    ['.', 'a'],
    ['.', 'missing'],
    ['./elsewhere', 'b'],
  ])
  t.equal(edge.to, undefined, 'detached')
  t.equal(node.edgesIn.size, 1, 'the other edge stays')
  t.equal(graph.nodes.get(a), node, 'the node stays')
  t.ok(graph.mainImporter.edgesOut.get('b')?.to, 'others untouched')
  // twice: already detached
  detachLinks(graph, [['.', 'a']])
  t.equal(edge.to, undefined)
})

t.test('what an install may skip or record', async t => {
  const add = (modified: boolean, size = 0) =>
    Object.assign(
      new Map([
        [
          joinDepIDTuple(['file', '.']),
          new Map(
            Array.from({ length: size }, (_, i) => [`d${i}`, {}]),
          ),
        ],
      ]),
      { modifiedDependencies: modified },
    ) as unknown as AddImportersDependenciesMap
  const cases: [string, Partial<InstallStateOptions>, boolean][] = [
    ['no check asked for', { upToDateCheck: false }, false],
    ['lockfile only', { lockfileOnly: true }, false],
    ['skills', { allowSkills: '*' }, false],
    ['ci', { cleanInstall: true }, true],
    ['frozen', { frozenLockfile: true }, true],
    ['expect', { expectLockfile: true }, true],
    ['add', { add: add(true, 1) }, true],
    ['unmodified add', { add: add(false, 1) }, true],
  ]
  for (const [name, extra, records] of cases) {
    await t.test(name, async t => {
      const { record, start, path, options, age } = setup(t)
      age()
      record()
      const res = start({ ...options, ...extra })
      t.notOk(res.hit, 'never a hit')
      t.notOk(existsSync(path(stateFile)), 'state removed')
      t.equal(!!res.state, records, 'records the result')
    })
  }

  await t.test('an empty add is a plain install', async t => {
    const { record, start, options, age } = setup(t)
    age()
    record()
    t.ok(start({ ...options, add: add(false) }).hit)
  })

  await t.test('modifiers', async t => {
    const { record, start, age } = setup(t)
    age()
    record()
    modifiers = { ':root > #a': '2' }
    const res = start()
    t.notOk(res.hit)
    t.notOk(res.state)
  })

  await t.test('a workspace filter', async t => {
    const { projectRoot, start, age } = setup(t, {
      'vlt.json': JSON.stringify({ workspaces: 'packages/*' }),
      packages: {
        w: { 'package.json': '{"name":"w"}' },
        v: { 'package.json': '{"name":"v"}' },
      },
    })
    age()
    const res = start({
      projectRoot,
      upToDateCheck: true,
      monorepo: Monorepo.load(projectRoot, {
        config: { packages: ['packages/*'] },
        load: { paths: ['packages/w'] },
      }),
      fullMonorepo: Monorepo.load(projectRoot, {
        config: { packages: ['packages/*'] },
        load: {},
      }),
    })
    t.notOk(res.state)
  })

  await t.test('an unreadable input', async t => {
    const { start, path } = setup(t)
    rmSync(path('vlt.json'))
    mkdirSync(path('vlt.json'))
    t.strictSame(start(), { links: [] }, 'nothing to record with')
  })

  await t.test('an unremovable state', async t => {
    const { path } = setup(t)
    mkdirSync(path(stateFile))
    removeInstallState(path('.'))
    t.ok(existsSync(path(stateFile)), 'best effort')
  })
})

t.test('what is never recorded', async t => {
  await t.test(
    'an input changed after this process started',
    async t => {
      const { record, path, age } = setup(t)
      age()
      t.intercept(performance, 'timeOrigin', {
        value: Date.now() - 60_000,
      })
      record()
      t.notOk(existsSync(path(stateFile)))
    },
  )

  await t.test('a file dep manifest changed since then', async t => {
    const { graph, path, age } = setup(t, {
      local: { 'package.json': '{"name":"local"}' },
    })
    age()
    const local = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('local', 'file:./local'),
      { name: 'local' },
      localId,
    )
    if (!local) throw new Error('no file node')
    local.location = './local'
    symlinkSync('../local', path('node_modules/local'), 'junction')
    const state = startInstallState({
      projectRoot: path('.'),
      upToDateCheck: true,
    }).state
    t.intercept(performance, 'timeOrigin', {
      value: Date.now() - 60_000,
    })
    state?.setReplay(
      graph,
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
      false,
    )
    state?.save(graph)
    t.notOk(existsSync(path(stateFile)))
  })

  await t.test('an unreadable file dep manifest', async t => {
    const { record, graph, path, age } = setup(t, {
      local: { 'package.json': {} },
    })
    age()
    const local = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('local', 'file:./local'),
      { name: 'local' },
      localId,
    )
    if (!local) throw new Error('no file node')
    local.location = './local'
    symlinkSync('../local', path('node_modules/local'), 'junction')
    record()
    t.notOk(existsSync(path(stateFile)))
  })

  await t.test('a git dep not locked to a commit', async t => {
    const { record, graph, path, age } = setup(t)
    age()
    const git = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('g', 'github:x/y#main'),
      { name: 'g', version: '1.0.0' },
    )
    if (!git) throw new Error('no git node')
    symlinkSync('.vlt', path('node_modules/g'), 'junction')
    record()
    t.notOk(existsSync(path(stateFile)), 'ref only')
    git.resolved = `https://codeload.github.com/x/y/tar.gz/${'a'.repeat(40)}`
    record()
    t.ok(existsSync(path(stateFile)), 'pinned')
  })

  await t.test('a lockfile the next no-op would reify', async t => {
    const { record, path, age } = setup(t)
    age()
    record(
      undefined,
      lockfile({ [a]: [0, 'a'] }),
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
    )
    t.notOk(existsSync(path(stateFile)), 'b not installed')
    record(
      undefined,
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'], [opt]: [0, 'opt'] }),
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
    )
    t.notOk(existsSync(path(stateFile)), 'opt not locked')
    record(undefined, null)
    t.notOk(existsSync(path(stateFile)), 'no hidden lockfile saved')
  })

  await t.test('an unwritable state', async t => {
    const { record, path, age } = setup(t)
    age()
    mkdirSync(path(stateFile))
    t.doesNotThrow(() => record())
  })

  await t.test(
    'a dependency the next install resolves again',
    async t => {
      const { record, graph, path, age } = setup(t, {
        local: { 'package.json': '{"name":"local"}' },
      })
      age()
      const root = graph.mainImporter
      root.manifest = {
        name: 'root',
        version: '1.0.0',
        dependencies: { a: '1' },
        devDependencies: { b: '1' },
        // only constrains a
        peerDependencies: { a: '>=1' },
      }
      const local = graph.placePackage(
        root,
        'prod',
        Spec.parse('local', 'file:./local'),
        { name: 'local', dependencies: { c: '1' } },
        localId,
      )
      if (!local) throw new Error('no file node')
      local.location = './local'
      symlinkSync('../local', path('node_modules/local'), 'junction')
      // a file dep that is no directory is not read again
      const tgz = graph.placePackage(
        local,
        'prod',
        Spec.parse('tgz', 'file:./x.tgz'),
        { name: 'tgz', dependencies: { d: '1' } },
        joinDepIDTuple(['file', 'x.tgz']),
      )
      if (!tgz) throw new Error('no file node')
      tgz.location = './x.tgz'
      const c = joinDepIDTuple(['registry', '', 'c@1.0.0'])
      const locked = {
        [`${root.id} a`]: `prod 1 ${a}`,
        [`${root.id} b`]: `dev 1 ${b}`,
        [`${localId} c`]: `prod 1 ${c}`,
      }
      const recorded = (edges: Record<string, string>) => {
        rmSync(path(stateFile), { force: true })
        record(undefined, undefined, {
          ...lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
          edges,
        } as LockfileData)
        return existsSync(path(stateFile))
      }
      const without = (key: string) =>
        Object.fromEntries(
          Object.entries(locked).filter(([k]) => k !== key),
        )
      t.ok(recorded(locked), 'locked as declared')
      t.notOk(
        recorded(without(`${root.id} a`)),
        'never placed, eg a failed optional',
      )
      t.notOk(
        recorded({ ...locked, [`${root.id} a`]: 'prod 1 MISSING' }),
        'a dangling edge',
      )
      t.notOk(
        recorded({ ...locked, [`${root.id} a`]: `prod 2 ${a}` }),
        'another spec',
      )
      t.notOk(
        recorded({ ...locked, [`${root.id} b`]: `prod 1 ${b}` }),
        'another type',
      )
      t.notOk(
        recorded(without(`${localId} c`)),
        'a directory dep manifest is read again',
      )
    },
  )
})

// what `vlt install c` hands over
const addC = () =>
  Object.assign(
    new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map([
          [
            'c',
            asDependency({
              spec: Spec.parse('c', '1'),
              type: 'prod',
            }),
          ],
        ]),
      ],
    ]),
    { modifiedDependencies: true },
  ) as AddImportersDependenciesMap

t.test('the lockfiles an install writes are recorded', async t => {
  const { record, start, path, state, options, age, graph } = setup(t)
  age()
  const st = startInstallState({ ...options, add: addC() }).state
  // edited during the install
  writeFileSync(path('vlt.json'), '{"y":2}')
  // written by it
  writeFileSync(path('vlt-lock.json'), '{"nodes":{"x":1}}')
  writeFileSync(path('package.json'), '{"name":"root"}')
  st?.setReplay(
    graph,
    lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
    lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
    true,
  )
  st?.save(graph)
  const inputs = state().inputs
  t.equal(inputs[0]?.[3], 1, 'package.json as written')
  t.equal(inputs[2]?.[3], 1, 'vlt-lock.json as written')
  t.notOk(start().hit, 'the edit is a miss')
  writeFileSync(path('vlt.json'), '{}')
  utimesSync(path('vlt.json'), old, old)
  record()
  t.ok(start().hit)
})

t.test('only the manifests an add saves are re-read', async t => {
  const { projectRoot, graph, path, age } = setup(t, {
    'vlt.json': JSON.stringify({ workspaces: 'packages/*' }),
    packages: {
      w: { 'package.json': '{"name":"w","version":"1.0.0"}' },
    },
  })
  age()
  utimesSync(path('packages/w/package.json'), old, old)
  const loadMonorepo = () =>
    Monorepo.load(projectRoot, {
      config: { packages: ['packages/*'] },
      load: {},
    })
  const o = {
    projectRoot,
    upToDateCheck: true,
    monorepo: loadMonorepo(),
    fullMonorepo: loadMonorepo(),
  }
  const install = (during: () => void) => {
    const st = startInstallState({ ...o, add: addC() }).state
    during()
    st?.setReplay(
      graph,
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
      lockfile({ [a]: [0, 'a'], [b]: [0, 'b'] }),
      false,
    )
    st?.save(graph)
  }
  const saveC = (spec: string) =>
    writeFileSync(
      path('package.json'),
      JSON.stringify({ name: 'root', dependencies: { c: spec } }),
    )
  install(() => saveC('1'))
  t.ok(startInstallState(o).hit, 'what the add saved')
  install(() => {
    saveC('2')
    // edited by another process while the add runs
    writeFileSync(
      path('packages/w/package.json'),
      '{"name":"w","dependencies":{"x":"1"}}',
    )
  })
  t.notOk(startInstallState(o).hit, 'a workspace it did not save')
})

t.test('a no-op reify', async t => {
  const { start, path, state, options, graph, age } = setup(t)
  age()
  const diff = (g: Graph) =>
    ({
      to: g,
      nodes: {
        add: new Set([
          graph.mainImporter,
          { importer: false, id: opt, name: 'opt', version: '2.0.0' },
          { importer: false, id: gitOpt, name: 'y' },
        ]),
      },
    }) as unknown as Diff
  startInstallState(options).state?.saveNoop(diff(graph), [b])
  t.strictSame(state().add, [['opt', '2.0.0'], ['y']])
  t.strictSame(state().buildQueue, [b])
  t.equal(state().nodes, 3)
  t.strictSame(start().hit, {
    buildQueue: [b],
    upToDate: { nodes: 3, add: [['opt', '2.0.0'], ['y']] },
  })

  // a frozen install records, w/o checking first
  const frozen = { ...options, frozenLockfile: true }
  const s = startInstallState(frozen).state
  writeFileSync(
    path('node_modules/.vlt-lock.json'),
    '{"nodes":{"x":1}}',
  )
  s?.saveNoop(diff(graph), [])
  t.notOk(existsSync(path(stateFile)), 'it wrote the hidden lockfile')

  const s2 = startInstallState(frozen).state
  writeFileSync(path('vlt-lock.json'), '{"nodes":{"x":1}}')
  s2?.saveNoop(diff(graph), [])
  t.notOk(existsSync(path(stateFile)), 'it wrote the main lockfile')

  startInstallState(frozen).state?.save(graph)
  t.notOk(existsSync(path(stateFile)), 'nothing to replay')

  startInstallState(frozen).state?.saveNoop(
    { to: graph, nodes: { add: new Set() } } as unknown as Diff,
    [],
  )
  t.strictSame(
    start().hit,
    { buildQueue: undefined, upToDate: { nodes: 3, add: [] } },
    'nothing to build',
  )
})

t.test('a no-op reify w/ a dependency to resolve again', async t => {
  const { path, options, graph, age } = setup(t)
  age()
  const root = graph.mainImporter
  const noop = () => {
    rmSync(path(stateFile), { force: true })
    startInstallState(options).state?.saveNoop(
      { to: graph, nodes: { add: new Set() } } as unknown as Diff,
      [],
    )
    return existsSync(path(stateFile))
  }
  root.manifest = {
    name: 'root',
    version: '1.0.0',
    dependencies: { a: '1', b: '1' },
  }
  t.ok(noop(), 'locked as declared')
  root.manifest.optionalDependencies = { c: '1' }
  t.notOk(noop(), 'never placed')
  graph.placePackage(root, 'optional', Spec.parse('c', '1'))
  t.notOk(noop(), 'a dangling edge')
})
