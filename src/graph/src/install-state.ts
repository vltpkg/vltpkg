import { createHash } from 'node:crypto'
import {
  lstatSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { assertRecordStringString } from '@vltpkg/types'
import { load } from '@vltpkg/vlt-json'
import type { Monorepo } from '@vltpkg/workspaces'
import pkg from '@vltpkg/graph/package.json' with { type: 'json' }
import type { AddImportersDependenciesMap } from './dependencies.ts'
import type { Diff } from './diff.ts'
import { gitPinned } from './git-pin.ts'
import type { Graph } from './graph.ts'
import { registrySpecVersion } from './lockfile/load-nodes.ts'
import {
  BuildStateNeeded,
  getBooleanFlagsFromNum,
} from './lockfile/types.ts'
import type { LockfileData, LockfileNode } from './lockfile/types.ts'

const STATE_VERSION = 1
const stateFile = 'node_modules/.vlt/state.json'
const hiddenFile = 'node_modules/.vlt-lock.json'

// options that change what an install places
const configKeys = [
  'allowScripts',
  'arch',
  'before',
  'brotli-tarballs',
  'catalog',
  'catalogs',
  'default-registry-alias',
  'git-host-archives',
  'git-hosts',
  'git-shallow',
  'jsr-registries',
  'libc',
  'node-version',
  'os',
  'registries',
  'registry',
  'scoped-registries',
  'store-linker',
  'tag',
] as const

// a file changed within this many ns of a capture may keep its mtime
const racyWindow = 2_000_000_000n

/** `[size, mtimeNs, ctimeNs, ino]` */
type Stamp = [string, string, string, string]

/** `[path, stamp (null: absent), sha256, racy]` */
type Input = [string, Stamp | null, string?, 1?]

/** What a full no-op install reports, for an up-to-date tree. */
export type UpToDate = {
  /** nodes in the ideal graph */
  nodes: number
  /** locked nodes that are not installed, as `[name, version]` */
  add: ([string] | [string, string])[]
}

type Replay = UpToDate & {
  buildQueue: DepID[]
  /** the ids in `add` */
  missing: Set<DepID>
  noop?: boolean
}

type StateData = UpToDate & {
  v: number
  vlt: string
  config: string
  workspaces: string[]
  inputs: Input[]
  hidden: Stamp
  /** importer links, as `[importer location, dependency name]` */
  tree: [string, string][]
  buildQueue: DepID[]
}

export type InstallStateOptions = Partial<
  Record<(typeof configKeys)[number], unknown>
> & {
  projectRoot: string
  upToDateCheck?: boolean
  lockfileOnly?: boolean
  cleanInstall?: boolean
  frozenLockfile?: boolean
  expectLockfile?: boolean
  allowSkills?: string
  /** the workspaces the install targets */
  monorepo?: Monorepo
  /** every workspace */
  fullMonorepo?: Monorepo
  add?: AddImportersDependenciesMap
}

export type InstallStateStart = {
  /** the tree is up to date: what a full no-op install returns */
  hit?: { buildQueue?: DepID[]; upToDate: UpToDate }
  /** records the tree once this install is done */
  state?: InstallState
  /** importer links the tree lost, as `[importer location, name]` */
  links: [string, string][]
}

const ns = (ms: number) => BigInt(Math.floor(ms * 1000)) * 1000n

const stamp = (path: string): Stamp | null => {
  const st = statSync(path, { bigint: true, throwIfNoEntry: false })
  return st ?
      [
        String(st.size),
        String(st.mtimeNs),
        String(st.ctimeNs),
        String(st.ino),
      ]
    : null
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

const isLink = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()

const isDir = (path: string) =>
  !!lstatSync(path, { throwIfNoEntry: false })?.isDirectory()

const sha = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('base64')

const capture = (root: string, path: string, now: bigint): Input => {
  const abs = resolve(root, path)
  const st = stamp(abs)
  if (!st) return [path, null]
  const input: Input = [path, st, sha(readFileSync(abs))]
  if (now - BigInt(st[1]) < racyWindow) input[3] = 1
  return input
}

// the input to record if the file is as recorded, else undefined
const verify = (
  root: string,
  input: Input,
  now: bigint,
): Input | undefined => {
  const [path, st, hash, racy] = input
  const cur = stamp(resolve(root, path))
  if (!st || !cur) return st === cur ? input : undefined
  if (!racy && same(st, cur)) return input
  // same bytes w/ a new stamp (eg rewritten as is) still match
  const next = capture(root, path, now)
  return next[2] === hash ? next : undefined
}

const sorted = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sorted)
  if (!value || typeof value !== 'object') return value
  const proto: unknown = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => [k, sorted(v)]),
  )
}

const configHash = (options: InstallStateOptions) =>
  sha(
    JSON.stringify([
      configKeys.map(k => sorted(options[k])),
      process.platform,
      process.arch,
      process.version,
    ]),
  )

const workspaces = (monorepo?: Monorepo) =>
  [...(monorepo?.values() ?? [])].map(ws => ws.path).sort()

/**
 * Remove the recorded state, before anything changes the tree.
 */
export const removeInstallState = (projectRoot: string) => {
  try {
    rmSync(resolve(projectRoot, stateFile), { force: true })
  } catch {}
}

const writeState = (root: string, data: StateData) => {
  try {
    writeFileSync(resolve(root, stateFile), JSON.stringify(data))
  } catch {}
}

const check = (
  options: InstallStateOptions,
): Omit<InstallStateStart, 'state'> => {
  const root = options.projectRoot
  const miss = { links: [] }
  const data = JSON.parse(
    readFileSync(resolve(root, stateFile), 'utf8'),
  ) as StateData
  if (
    data.v !== STATE_VERSION ||
    data.vlt !== pkg.version ||
    data.config !== configHash(options) ||
    !same(data.workspaces, workspaces(options.fullMonorepo)) ||
    // never hashed: a rewrite always gets a new stamp
    !same(data.hidden, stamp(resolve(root, hiddenFile)))
  ) {
    return miss
  }
  const now = ns(Date.now())
  let refresh = false
  const inputs: Input[] = []
  for (const input of data.inputs) {
    const next = verify(root, input, now)
    if (!next) return miss
    refresh ||= !same(next, input)
    inputs.push(next)
  }
  if (
    !isDir(resolve(root, 'node_modules')) ||
    !isDir(resolve(root, 'node_modules/.vlt'))
  ) {
    return miss
  }
  const links = data.tree.filter(
    ([location, name]) =>
      !isLink(resolve(root, location, 'node_modules', name)),
  )
  if (links.length) return { links }
  if (refresh) writeState(root, { ...data, inputs })
  const { buildQueue, nodes, add } = data
  return {
    hit: {
      buildQueue: buildQueue.length ? buildQueue : undefined,
      upToDate: { nodes, add },
    },
    links,
  }
}

/**
 * Check the state the last install recorded against the tree and its
 * inputs. On a hit, the install has nothing to do. Otherwise the state
 * is removed, and an {@link InstallState} takes a snapshot of the
 * inputs to record once the install is done.
 */
export const startInstallState = (
  options: InstallStateOptions,
): InstallStateStart => {
  const { add, monorepo, fullMonorepo, projectRoot } = options
  const record =
    !!options.upToDateCheck &&
    !options.lockfileOnly &&
    !options.allowSkills &&
    (monorepo?.size ?? 0) === (fullMonorepo?.size ?? 0) &&
    !load('modifiers', assertRecordStringString)
  const gate =
    record &&
    !options.cleanInstall &&
    !options.frozenLockfile &&
    !options.expectLockfile &&
    !add?.modifiedDependencies &&
    ![...(add?.values() ?? [])].some(deps => deps.size)
  let links: [string, string][] = []
  if (gate) {
    try {
      const res = check(options)
      if (res.hit) return res
      links = res.links
    } catch {}
  }
  removeInstallState(projectRoot)
  if (!record) return { links }
  try {
    return { links, state: new InstallState(options) }
  } catch {
    return { links }
  }
}

/**
 * Detach the importer edges whose links are gone from an actual graph,
 * so that the diff links them again. The nodes and their build state
 * stay.
 */
export const detachLinks = (
  graph: Graph,
  links: [string, string][],
) => {
  for (const [location, name] of links) {
    for (const importer of graph.importers) {
      if (importer.location !== location) continue
      const edge = importer.edgesOut.get(name)
      if (!edge?.to) continue
      edge.to.edgesIn.delete(edge)
      edge.to = undefined
    }
  }
}

/**
 * The state of an install's inputs as it started, recorded to
 * `node_modules/.vlt/state.json` once the tree is in place, along with
 * what a full no-op install would report on it.
 */
export class InstallState {
  #root: string
  #config: string
  #workspaces: string[]
  #inputs: Input[]
  #hidden: Stamp | null
  #tainted: boolean
  #written = new Set<string>()
  #replay?: Replay

  constructor(options: InstallStateOptions) {
    const root = options.projectRoot
    this.#root = root
    this.#config = configHash(options)
    this.#workspaces = workspaces(options.fullMonorepo)
    const manifests = [
      'package.json',
      ...this.#workspaces.map(p => join(p, 'package.json')),
    ]
    const now = ns(Date.now())
    this.#inputs = [
      ...manifests,
      'vlt.json',
      'vlt-lock.json',
      'pnpm-workspace.yaml',
    ].map(p => capture(root, p, now))
    this.#hidden = stamp(resolve(root, hiddenFile))
    // changed since this process started: it may have read it before
    const origin = ns(performance.timeOrigin)
    this.#tainted = this.#inputs.some(
      ([, st]) => !!st && BigInt(st[2]) >= origin,
    )
    // rewritten by the install itself
    if (options.add?.modifiedDependencies) {
      for (const p of manifests) this.#written.add(p)
    }
  }

  /**
   * The lockfiles a reifying install wrote: what the next full no-op
   * loads and reports.
   */
  setReplay(
    graph: Graph,
    data: LockfileData,
    hidden: LockfileData | undefined,
    lockfileWritten: boolean,
  ) {
    if (lockfileWritten) this.#written.add('vlt-lock.json')
    if (!hidden) return
    const replay: Replay = {
      buildQueue: [],
      add: [],
      missing: new Set(),
      nodes: graph.importers.size + Object.keys(data.nodes).length,
    }
    const nodes = Object.entries(data.nodes) as [
      DepID,
      LockfileNode,
    ][]
    for (const [id, [flags, name]] of nodes) {
      if (hidden.nodes[id]) continue
      // anything else not installed would be reified by a no-op
      if (!getBooleanFlagsFromNum(flags).optional) return
      const [type, , spec] = splitDepID(id)
      const version =
        type === 'registry' && spec ?
          registrySpecVersion(spec)
        : undefined
      const n = name ?? id
      replay.add.push(version ? [n, version] : [n])
      replay.missing.add(id)
    }
    for (const [id, node] of Object.entries(hidden.nodes) as [
      DepID,
      LockfileNode,
    ][]) {
      if (!data.nodes[id]) return
      if (node[9] === BuildStateNeeded) replay.buildQueue.push(id)
    }
    this.#replay = replay
  }

  /**
   * Record the state after a no-op reify, unless it wrote a lockfile.
   */
  saveNoop(diff: Diff, buildQueue: DepID[]) {
    const replay: Replay = {
      buildQueue,
      add: [],
      missing: new Set(),
      nodes: diff.to.nodes.size,
      noop: true,
    }
    for (const node of diff.nodes.add) {
      if (node.importer) continue
      replay.add.push(
        node.version ? [node.name, node.version] : [node.name],
      )
      replay.missing.add(node.id)
    }
    this.#replay = replay
    this.save(diff.to)
  }

  /**
   * Write the state file, if the tree is as the graph says. Never
   * throws: the next install then takes the full path.
   */
  save(graph: Graph) {
    try {
      const data = this.#data(graph)
      if (data) writeState(this.#root, data)
    } catch {}
  }

  #data(graph: Graph): StateData | undefined {
    const root = this.#root
    const replay = this.#replay
    if (!replay || this.#tainted) return
    if (!isDir(resolve(root, 'node_modules/.vlt'))) return
    // every rewrite of it removes the state, see saveHidden()
    const hidden = stamp(resolve(root, hiddenFile))
    if (!hidden) return
    const lockfile = this.#inputs.find(([p]) => p === 'vlt-lock.json')
    if (
      replay.noop &&
      (!same(hidden, this.#hidden) ||
        !same(stamp(resolve(root, 'vlt-lock.json')), lockfile?.[1]))
    ) {
      return
    }
    for (const node of graph.nodes.values()) {
      // re-resolved by every install until pinned to a commit
      if (node.id.startsWith('git~') && !gitPinned(node)) return
    }
    const tree: [string, string][] = []
    for (const importer of graph.importers) {
      for (const { spec, to } of importer.edgesOut.values()) {
        if (!to || graph.nodes.get(to.id) !== to) continue
        if (replay.missing.has(to.id)) continue
        const link = resolve(
          root,
          importer.location,
          'node_modules',
          spec.name,
        )
        if (!isLink(link)) return
        tree.push([importer.location, spec.name])
      }
    }
    const now = ns(Date.now())
    const inputs = this.#inputs.map(input =>
      this.#written.has(input[0]) ?
        capture(root, input[0], now)
      : input,
    )
    // the manifests of directory deps are read on every install
    const origin = ns(performance.timeOrigin)
    for (const node of graph.nodes.values()) {
      if (node.importer || !node.id.startsWith('file')) continue
      const path = join(node.location, 'package.json')
      if (inputs.some(([p]) => p === path)) continue
      const input = capture(root, path, now)
      if (input[1] && BigInt(input[1][2]) >= origin) return
      inputs.push(input)
    }
    return {
      v: STATE_VERSION,
      vlt: pkg.version,
      config: this.#config,
      workspaces: this.#workspaces,
      inputs,
      hidden,
      tree,
      buildQueue: replay.buildQueue,
      nodes: replay.nodes,
      add: replay.add,
    }
  }
}
