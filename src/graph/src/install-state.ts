import type { DepID } from '@vltpkg/dep-id'
import type { Monorepo } from '@vltpkg/workspaces'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { trace } from '@vltpkg/output/trace'
import type { Graph } from './graph.ts'
import { lockfileOptions } from './lockfile/save.ts'
import type { SaveOptions } from './lockfile/save.ts'

/** size, mtime in ms and inode of an input file; null when absent */
export type Stamp =
  [size: number, mtimeMs: number, ino: number] | null

/**
 * What an install left behind, written when it finished: enough to tell
 * whether the next `vlt install` would change anything without loading
 * either graph. See {@link checkInstallState}.
 */
export type InstallState = {
  v: 1
  /** digest of the lockfile options block the install ran with */
  options: string
  /** every input file, by path relative to the project root */
  stamps: Record<string, Stamp>
  /** store directory names under `node_modules/.vlt` */
  store: string[]
  /** for each importer location, the links its node_modules must hold */
  links: Record<string, string[]>
  /** how many nodes the graph had */
  nodes: number
  /** nodes still to be built, as the install reported them */
  buildQueue: DepID[]
}

export const INSTALL_STATE_FILE =
  'node_modules/.vlt/install-state.json'

export type InstallStateOptions = Omit<
  SaveOptions,
  | 'graph'
  | 'saveManifests'
  | 'saveBuildData'
  | 'throwOnMissingManifest'
> & {
  projectRoot: string
  monorepo?: Monorepo
}

const stamp = (path: string): Stamp => {
  const st = statSync(path, { throwIfNoEntry: false })
  return st ? [st.size, st.mtimeMs, st.ino] : null
}

// the files whose contents decide what an install does: the manifests,
// the configuration, the workspace definitions and both lockfiles
const inputs = (monorepo?: Monorepo): string[] => {
  const files = [
    'package.json',
    'vlt.json',
    'pnpm-workspace.yaml',
    'vlt-lock.json',
    'node_modules/.vlt-lock.json',
  ]
  for (const ws of monorepo?.values() ?? []) {
    files.push(`${ws.path}/package.json`)
  }
  return files
}

const optionsDigest = (options: InstallStateOptions): string =>
  createHash('sha256')
    .update(JSON.stringify(lockfileOptions(options)))
    .digest('hex')

/**
 * Record the state an install left behind. Called once the lockfiles are
 * written, so their stamps are final. Never throws: a state that cannot
 * be written only costs the next install its shortcut.
 */
export const saveInstallState = (
  options: InstallStateOptions & {
    graph: Graph
    buildQueue?: DepID[]
  },
): void => {
  const { graph, projectRoot, monorepo, buildQueue = [] } = options
  const stamps: Record<string, Stamp> = {}
  for (const file of inputs(monorepo)) {
    stamps[file] = stamp(resolve(projectRoot, file))
  }
  const store: string[] = []
  const links: Record<string, string[]> = {}
  for (const node of graph.nodes.values()) {
    if (node.importer) {
      const names: string[] = []
      for (const edge of node.edgesOut.values()) {
        if (edge.to) names.push(edge.name)
      }
      links[node.location] = names.sort()
    } else if (node.inVltStore()) {
      store.push(node.id)
    }
  }
  const state: InstallState = {
    v: 1,
    options: optionsDigest(options),
    stamps,
    store: store.sort(),
    links,
    nodes: graph.nodes.size,
    buildQueue,
  }
  const file = resolve(projectRoot, INSTALL_STATE_FILE)
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(state))
  } catch {
    // the next install does the full comparison
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x)

// the shape {@link saveInstallState} writes; anything else, from an
// older or damaged file, is no state at all
const isInstallState = (x: unknown): x is InstallState =>
  isRecord(x) &&
  x.v === 1 &&
  typeof x.options === 'string' &&
  isRecord(x.stamps) &&
  Array.isArray(x.store) &&
  isRecord(x.links) &&
  typeof x.nodes === 'number' &&
  Array.isArray(x.buildQueue)

// every name in `names` has an entry in the node_modules at `nm`; a
// scoped name needs its scope directory, and the name inside it
const linksStanding = (nm: string, names: string[]): boolean => {
  if (!names.length) return true
  let entries: Set<string>
  try {
    entries = new Set(readdirSync(nm))
  } catch {
    return false
  }
  const scopes = new Map<string, Set<string>>()
  for (const name of names) {
    const slash = name.indexOf('/')
    if (slash === -1) {
      if (!entries.has(name)) return false
      continue
    }
    const scope = name.slice(0, slash)
    let inScope = scopes.get(scope)
    if (!inScope) {
      try {
        inScope = new Set(readdirSync(resolve(nm, scope)))
      } catch {
        return false
      }
      scopes.set(scope, inScope)
    }
    if (!inScope.has(name.slice(slash + 1))) return false
  }
  return true
}

/**
 * Whether the last install's state still holds, so that `vlt install`
 * with no new dependencies would change nothing: every input file is
 * the one that install saw (same size, mtime and inode), the
 * configuration digests the same, every store directory is present and
 * every importer's node_modules holds every link. Returns the state
 * when it holds, undefined otherwise, and never throws.
 */
export const checkInstallState = (
  options: InstallStateOptions,
): InstallState | undefined => {
  const { projectRoot, monorepo } = options
  // every way out but one is a miss; the trace says which
  const miss = (reason: string, detail?: string) => {
    trace('install:state-miss', { reason, detail })
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(
      readFileSync(resolve(projectRoot, INSTALL_STATE_FILE), 'utf8'),
    )
  } catch {
    return miss('unreadable')
  }
  if (!isInstallState(parsed)) return miss('invalid')
  const state = parsed
  if (state.options !== optionsDigest(options)) return miss('options')
  const files = inputs(monorepo)
  // the same set of inputs, each one as it was
  const stamped = Object.keys(state.stamps)
  if (
    stamped.length !== files.length ||
    files.some(f => !(f in state.stamps))
  ) {
    return miss('inputs')
  }
  for (const file of files) {
    const was = state.stamps[file]
    const now = stamp(resolve(projectRoot, file))
    if (
      (was === null) !== (now === null) ||
      (was &&
        now &&
        (was[0] !== now[0] || was[1] !== now[1] || was[2] !== now[2]))
    ) {
      return miss('stamp', file)
    }
  }
  if (state.store.length) {
    let entries: Set<string>
    try {
      entries = new Set(
        readdirSync(resolve(projectRoot, 'node_modules/.vlt')),
      )
      /* c8 ignore start - the state file was just read from this dir */
    } catch {
      return miss('store-dir')
    }
    /* c8 ignore stop */
    for (const id of state.store) {
      if (!entries.has(id)) return miss('store', id)
    }
  }
  for (const [location, names] of Object.entries(state.links)) {
    if (
      !linksStanding(
        resolve(projectRoot, location, 'node_modules'),
        names,
      )
    ) {
      return miss('links', location)
    }
  }
  trace('install:state-hit', { nodes: state.nodes })
  return state
}
