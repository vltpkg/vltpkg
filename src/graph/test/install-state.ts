import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { asNormalizedManifest } from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import {
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { Graph } from '../src/graph.ts'
import {
  checkInstallState,
  INSTALL_STATE_FILE,
  saveInstallState,
} from '../src/install-state.ts'
import type { InstallState } from '../src/install-state.ts'

const registry = 'https://registry.npmjs.org/'
const configData = { registry, registries: { npm: registry } }

// a project with a workspace, one registry dep on each importer, and the
// files on disk an install of it leaves behind
const setup = (t: Test) => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'root',
      version: '1.0.0',
      dependencies: { abbrev: '^2.0.0', '@scope/pkg': '^1.0.0' },
    }),
    'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    'vlt-lock.json': '{}',
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
          dependencies: { abbrev: '^2.0.0' },
        }),
      },
    },
    node_modules: {
      '.vlt-lock.json': '{}',
      '.vlt': {},
    },
  })
  // the state only asks a monorepo for its workspace paths
  const monorepo = {
    values: () => [{ path: 'packages/a' }],
  } as unknown as Monorepo
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest: { name: 'root', version: '1.0.0' },
  })
  const ws = graph.addNode(
    joinDepIDTuple(['workspace', 'packages/a']),
    asNormalizedManifest({ name: 'a', version: '1.0.0' }),
  )
  ws.setImporterLocation('./packages/a')
  graph.importers.add(ws)
  const abbrev = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('abbrev', '^2.0.0', configData),
    asNormalizedManifest({ name: 'abbrev', version: '2.0.0' }),
  )
  const scoped = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('@scope/pkg', '^1.0.0', configData),
    asNormalizedManifest({ name: '@scope/pkg', version: '1.0.0' }),
  )
  if (!abbrev || !scoped) throw new Error('setup failed')
  graph.placePackage(
    ws,
    'prod',
    Spec.parse('abbrev', '^2.0.0', configData),
    asNormalizedManifest({ name: 'abbrev', version: '2.0.0' }),
  )
  // the store dirs and links an install would have made
  const store = resolve(projectRoot, 'node_modules/.vlt')
  for (const node of [abbrev, scoped]) {
    mkdirSync(resolve(store, node.id), { recursive: true })
  }
  const nm = resolve(projectRoot, 'node_modules')
  symlinkSync(resolve(store, abbrev.id), resolve(nm, 'abbrev'))
  mkdirSync(resolve(nm, '@scope'))
  symlinkSync(resolve(store, scoped.id), resolve(nm, '@scope/pkg'))
  mkdirSync(resolve(projectRoot, 'packages/a/node_modules'))
  symlinkSync(
    resolve(store, abbrev.id),
    resolve(projectRoot, 'packages/a/node_modules/abbrev'),
  )
  const options = { ...configData, projectRoot, monorepo }
  return { projectRoot, graph, options, abbrev, scoped }
}

t.test('save, then check: the state holds', t => {
  const { projectRoot, graph, options, abbrev, scoped } = setup(t)
  t.equal(checkInstallState(options), undefined, 'nothing saved yet')
  saveInstallState({
    ...options,
    graph,
    buildQueue: [abbrev.id],
  })
  const raw = JSON.parse(
    readFileSync(resolve(projectRoot, INSTALL_STATE_FILE), 'utf8'),
  ) as InstallState
  t.match(raw, {
    v: 1,
    store: [abbrev.id, scoped.id].sort(),
    links: {
      '.': ['@scope/pkg', 'abbrev'],
      './packages/a': ['abbrev'],
    },
    nodes: 4,
    buildQueue: [abbrev.id],
  })
  t.strictSame(Object.keys(raw.stamps).sort(), [
    'node_modules/.vlt-lock.json',
    'package.json',
    'packages/a/package.json',
    'pnpm-workspace.yaml',
    'vlt-lock.json',
    'vlt.json',
  ])
  t.equal(
    raw.stamps['pnpm-workspace.yaml'],
    null,
    'absent input: null',
  )
  const state = checkInstallState(options)
  t.match(state, { nodes: 4, buildQueue: [abbrev.id] }, 'holds')
  t.end()
})

t.test('anything off and the state does not hold', t => {
  const { projectRoot, graph, options } = setup(t)
  const save = () => saveInstallState({ ...options, graph })
  const holds = () => !!checkInstallState(options)
  save()
  t.equal(holds(), true)

  // a changed configuration
  t.equal(
    !!checkInstallState({
      ...options,
      registry: 'https://x.example/',
    }),
    false,
    'other options',
  )
  // a rewritten input, same size: the mtime moves
  const pj = resolve(projectRoot, 'package.json')
  utimesSync(pj, new Date(0), new Date(0))
  t.equal(holds(), false, 'an input touched')
  save()
  t.equal(holds(), true)
  // an input that appears
  writeFileSync(
    resolve(projectRoot, 'pnpm-workspace.yaml'),
    'packages: []',
  )
  t.equal(holds(), false, 'an input appeared')
  rmSync(resolve(projectRoot, 'pnpm-workspace.yaml'))
  t.equal(holds(), true)
  // a different set of inputs (a workspace added to the config)
  t.equal(
    !!checkInstallState({ ...options, monorepo: undefined }),
    false,
    'other workspaces',
  )
  // a store dir gone
  const store = resolve(projectRoot, 'node_modules/.vlt')
  const [first] = [...graph.nodes.values()].filter(n => !n.importer)
  if (!first) throw new Error('no store node')
  const dir = resolve(store, first.id)
  rmSync(dir, { recursive: true })
  t.equal(holds(), false, 'a store dir missing')
  mkdirSync(dir)
  t.equal(holds(), true)
  // a link gone
  rmSync(resolve(projectRoot, 'packages/a/node_modules/abbrev'))
  t.equal(holds(), false, 'a workspace link missing')
  symlinkSync(
    dir,
    resolve(projectRoot, 'packages/a/node_modules/abbrev'),
  )
  t.equal(holds(), true)
  rmSync(resolve(projectRoot, 'node_modules/@scope/pkg'))
  t.equal(holds(), false, 'a scoped link missing')
  rmSync(resolve(projectRoot, 'node_modules/@scope'), {
    recursive: true,
  })
  t.equal(holds(), false, 'the scope dir missing')
  mkdirSync(resolve(projectRoot, 'node_modules/@scope'))
  symlinkSync(dir, resolve(projectRoot, 'node_modules/@scope/pkg'))
  t.equal(holds(), true)
  // a whole node_modules gone
  rmSync(resolve(projectRoot, 'packages/a/node_modules'), {
    recursive: true,
  })
  t.equal(holds(), false, 'a workspace node_modules missing')
  mkdirSync(resolve(projectRoot, 'packages/a/node_modules'))
  symlinkSync(
    dir,
    resolve(projectRoot, 'packages/a/node_modules/abbrev'),
  )
  rmSync(store, { recursive: true })
  t.equal(holds(), false, 'the store gone (and the state with it)')
  t.end()
})

t.test('a damaged or foreign state file is no state', t => {
  const { projectRoot, options } = setup(t)
  const file = resolve(projectRoot, INSTALL_STATE_FILE)
  writeFileSync(file, 'not json')
  t.equal(checkInstallState(options), undefined)
  writeFileSync(file, JSON.stringify({ v: 2 }))
  t.equal(checkInstallState(options), undefined)
  writeFileSync(file, JSON.stringify([1, 2]))
  t.equal(checkInstallState(options), undefined)
  t.end()
})

t.test('a state that cannot be written is not an error', t => {
  const { projectRoot, graph, options } = setup(t)
  // a file where the store dir should be
  rmSync(resolve(projectRoot, 'node_modules/.vlt'), {
    recursive: true,
  })
  writeFileSync(resolve(projectRoot, 'node_modules/.vlt'), '')
  t.doesNotThrow(() => saveInstallState({ ...options, graph }))
  t.equal(checkInstallState(options), undefined)
  t.end()
})

t.test('a project with no store nodes and no links', t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'bare',
      version: '1.0.0',
    }),
    'vlt-lock.json': '{}',
    node_modules: { '.vlt-lock.json': '{}' },
  })
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest: { name: 'bare', version: '1.0.0' },
  })
  const options = { ...configData, projectRoot }
  saveInstallState({ ...options, graph })
  t.match(checkInstallState(options), {
    store: [],
    links: { '.': [] },
    nodes: 1,
    buildQueue: [],
  })
  t.ok(
    [...graph.nodes.values()].every(n => n.importer),
    'importers only',
  )
  t.equal(joinDepIDTuple(['file', '.']), graph.mainImporter.id)
  t.end()
})
