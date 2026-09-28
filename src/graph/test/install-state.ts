import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import {
  INSTALL_STATE_VERSION,
  isUnfilteredInstall,
  installFingerprint,
  installStateFile,
  loadInstallState,
  removeHiddenLockfile,
  removeInstallState,
  saveInstallState,
  unchangedInstallState,
} from '../src/install-state.ts'
import type { Graph } from '../src/graph.ts'
import type { GraphModifier } from '../src/modifiers.ts'

const abbrevId = joinDepIDTuple(['registry', '', 'abbrev@2.0.0'])

const asGraph = (nodes: number) =>
  ({ nodes: { size: nodes } }) as unknown as Graph

const asModifiers = (config: Record<string, string>) =>
  ({ config }) as unknown as GraphModifier

/** a project with a lockfile and a hidden lockfile already in place */
const dir = (t: Test, extra: Record<string, unknown> = {}) =>
  t.testdir({
    'package.json': JSON.stringify({
      name: 'proj',
      version: '1.0.0',
      dependencies: { abbrev: '^2.0.0' },
    }),
    'vlt.json': JSON.stringify({}),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 1,
      options: {},
      nodes: { [abbrevId]: [0, 'abbrev'] },
      edges: {},
    }),
    node_modules: {
      '.vlt-lock.json': JSON.stringify({
        lockfileVersion: 1,
        options: {},
        nodes: { [abbrevId]: [0, 'abbrev'] },
        edges: {},
      }),
    },
    ...extra,
  })

t.test('no hidden lockfile means no fingerprint', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({ name: 'proj' }),
  })
  t.equal(
    installFingerprint({ projectRoot }),
    undefined,
    'nothing to anchor to',
  )
  t.equal(
    unchangedInstallState({ projectRoot }),
    undefined,
    'so never unchanged',
  )
  // a directory in its place is not a file
  mkdirSync(resolve(projectRoot, 'node_modules/.vlt-lock.json'), {
    recursive: true,
  })
  t.equal(
    installFingerprint({ projectRoot }),
    undefined,
    'a directory is not a hidden lockfile',
  )
})

t.test('record, match, invalidate', async t => {
  const projectRoot = dir(t)
  const options = { projectRoot }

  t.equal(
    unchangedInstallState(options),
    undefined,
    'nothing recorded yet',
  )

  saveInstallState({ ...options, graph: asGraph(3) }, [abbrevId])

  const state = loadInstallState(projectRoot)
  t.equal(state?.version, INSTALL_STATE_VERSION)
  t.equal(state?.nodeCount, 3)
  t.strictSame(state?.buildQueue, [abbrevId])

  t.strictSame(
    unchangedInstallState(options),
    state,
    'the recorded state comes back',
  )

  // rewriting a manifest with the same bytes must not invalidate
  const pj = resolve(projectRoot, 'package.json')
  const body = readFileSync(pj)
  const st = statSync(pj)
  utimesSync(pj, st.atime, new Date(st.mtimeMs + 10_000))
  writeFileSync(pj, body)
  t.ok(
    unchangedInstallState(options),
    'mtime alone does not invalidate',
  )

  for (const [name, file, body] of [
    [
      'a changed dependency range',
      'package.json',
      JSON.stringify({
        name: 'proj',
        version: '1.0.0',
        dependencies: { abbrev: '^1.0.0' },
      }),
    ],
    ['an edited lockfile', 'vlt-lock.json', '{"lockfileVersion":1}'],
    [
      'an edited vlt.json',
      'vlt.json',
      JSON.stringify({ workspaces: ['packages/*'] }),
    ],
    [
      'a rewritten hidden lockfile',
      'node_modules/.vlt-lock.json',
      '{"lockfileVersion":1,"options":{},"nodes":{},"edges":{}}',
    ],
  ] as [string, string, string][]) {
    const path = resolve(projectRoot, file)
    const before = readFileSync(path)
    writeFileSync(path, body)
    t.equal(unchangedInstallState(options), undefined, name)
    writeFileSync(path, before)
  }

  // a missing file is not the same as an empty one
  const lock = resolve(projectRoot, 'vlt-lock.json')
  const lockBody = readFileSync(lock)
  rmSync(lock)
  t.equal(
    unchangedInstallState(options),
    undefined,
    'a removed lockfile invalidates',
  )
  writeFileSync(lock, lockBody)
})

t.test('a deleted node_modules invalidates', async t => {
  const projectRoot = dir(t)
  const options = { projectRoot }
  saveInstallState({ ...options, graph: asGraph(1) }, [])
  t.ok(unchangedInstallState(options), 'recorded with node_modules')

  // the regular path heals a manually removed node_modules, so the fast
  // path has to notice when one is gone. rename rather than delete, so
  // that the hidden lockfile comes back byte for byte.
  const nm = resolve(projectRoot, 'node_modules')
  const away = resolve(projectRoot, 'away')
  renameSync(nm, away)
  t.equal(
    unchangedInstallState(options),
    undefined,
    'no node_modules, no fast path',
  )
  renameSync(away, nm)
  t.ok(unchangedInstallState(options), 'and back again')
})

t.test('config options are part of the check', async t => {
  const projectRoot = dir(t)
  const options = {
    projectRoot,
    registry: 'https://registry.npmjs.org/',
    catalog: { abbrev: '^2.0.0' },
    modifiers: asModifiers({ '#abbrev': '^2.0.0' }),
  }
  saveInstallState({ ...options, graph: asGraph(1) }, [])
  t.ok(unchangedInstallState(options), 'identical config matches')
  t.strictSame(
    loadInstallState(projectRoot)?.buildQueue,
    undefined,
    'an empty build queue is not stored',
  )

  t.equal(
    unchangedInstallState({
      ...options,
      registry: 'http://example.com/',
    }),
    undefined,
    'a changed registry invalidates',
  )
  t.equal(
    unchangedInstallState({
      ...options,
      catalog: { abbrev: '^1.0.0' },
    }),
    undefined,
    'a changed catalog entry invalidates',
  )
  t.equal(
    unchangedInstallState({
      ...options,
      modifiers: asModifiers({ '#abbrev': '^3.0.0' }),
    }),
    undefined,
    'a changed modifier invalidates',
  )
  t.equal(
    unchangedInstallState({ ...options, modifiers: undefined }),
    undefined,
    'a removed modifier invalidates',
  )
  t.ok(
    unchangedInstallState(options),
    'and the original config still matches',
  )
})

t.test('the workspace set is part of the check', async t => {
  const projectRoot = dir(t, {
    'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
  })
  t.chdir(projectRoot)
  unload('project')
  const load = () =>
    Monorepo.load(projectRoot, {
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
    })

  const options = { projectRoot, monorepo: load() }
  t.equal(options.monorepo.size, 2, 'two workspaces to start with')
  saveInstallState({ ...options, graph: asGraph(2) }, [])
  t.ok(unchangedInstallState({ projectRoot, monorepo: load() }))

  // a changed workspace manifest
  const bpj = resolve(projectRoot, 'packages/b/package.json')
  const before = readFileSync(bpj)
  writeFileSync(bpj, JSON.stringify({ name: 'b', version: '2.0.0' }))
  t.equal(
    unchangedInstallState({ projectRoot, monorepo: load() }),
    undefined,
    'a changed workspace package.json invalidates',
  )
  writeFileSync(bpj, before)
  t.ok(unchangedInstallState({ projectRoot, monorepo: load() }))

  // an added workspace
  mkdirSync(resolve(projectRoot, 'packages/c'))
  writeFileSync(
    resolve(projectRoot, 'packages/c/package.json'),
    JSON.stringify({ name: 'c', version: '1.0.0' }),
  )
  const grown = load()
  t.equal(grown.size, 3, 'three now')
  t.equal(
    unchangedInstallState({ projectRoot, monorepo: grown }),
    undefined,
    'an added workspace invalidates',
  )

  // a filtered monorepo is a different set, so it never matches a record
  // written from the full one
  saveInstallState(
    { ...options, monorepo: grown, graph: asGraph(3) },
    [],
  )
  const filtered = Monorepo.load(projectRoot, {
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    load: { paths: ['packages/a'] },
  })
  t.equal(filtered.size, 1, 'only one workspace loaded')
  t.equal(
    unchangedInstallState({ projectRoot, monorepo: filtered }),
    undefined,
    'a partial workspace set never matches',
  )
})

t.test('isUnfilteredInstall', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({ name: 'proj' }),
    'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
  })
  t.chdir(projectRoot)
  unload('project')
  const full = Monorepo.load(projectRoot, {
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
  })
  const filtered = Monorepo.load(projectRoot, {
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    load: { paths: ['packages/a'] },
  })
  t.equal(
    isUnfilteredInstall(undefined, undefined),
    true,
    'no monorepo',
  )
  t.equal(isUnfilteredInstall(full, full), true, 'the full set')
  t.equal(isUnfilteredInstall(filtered, full), false, 'a subset')
})

t.test('a corrupt or foreign record is ignored', async t => {
  const projectRoot = dir(t)
  writeFileSync(installStateFile(projectRoot), 'not json')
  t.equal(loadInstallState(projectRoot), undefined, 'not json')
  writeFileSync(
    installStateFile(projectRoot),
    JSON.stringify({ version: INSTALL_STATE_VERSION + 1 }),
  )
  t.equal(loadInstallState(projectRoot), undefined, 'wrong version')
})

t.test('removal', async t => {
  const projectRoot = dir(t)
  saveInstallState({ projectRoot, graph: asGraph(1) }, [])
  t.ok(loadInstallState(projectRoot), 'recorded')
  removeInstallState(projectRoot)
  t.equal(loadInstallState(projectRoot), undefined, 'removed')
  // removing an absent record is not an error
  removeInstallState(projectRoot)

  saveInstallState({ projectRoot, graph: asGraph(1) }, [])
  removeHiddenLockfile(projectRoot)
  t.equal(loadInstallState(projectRoot), undefined, 'record gone')
  t.equal(
    installFingerprint({ projectRoot }),
    undefined,
    'hidden lockfile gone too',
  )
})

t.test('saving is best effort', async t => {
  // no node_modules to write into
  const bare = t.testdir({
    'package.json': JSON.stringify({ name: 'proj' }),
  })
  saveInstallState({ projectRoot: bare, graph: asGraph(0) }, [])
  t.equal(
    loadInstallState(bare),
    undefined,
    'nothing recorded, nothing thrown',
  )

  // a record that cannot be written is not an install failure
  const projectRoot = dir(t)
  mkdirSync(installStateFile(projectRoot))
  saveInstallState({ projectRoot, graph: asGraph(1) }, [])
  t.equal(
    loadInstallState(projectRoot),
    undefined,
    'an unwritable record is swallowed',
  )
})
