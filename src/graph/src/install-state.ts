import type { DepID } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import type { Monorepo } from '@vltpkg/workspaces'
import { createHash } from 'node:crypto'
import type { Hash } from 'node:crypto'
import {
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import type { Graph } from './graph.ts'
import {
  currentLockfileOptions,
  diffLockfileOptions,
} from './lockfile/options.ts'
import type { GraphModifier } from './modifiers.ts'
import type { LockfileData } from './lockfile/types.ts'

/**
 * Bump when the set of inputs that {@link installFingerprint} covers, or
 * the way it covers them, changes. A recorded state with a different
 * version is ignored, so the next install takes the regular path.
 */
export const INSTALL_STATE_VERSION = 1

/**
 * Everything the install fast path needs in order to decide that the
 * installed tree is already up to date, recorded next to the hidden
 * lockfile when a reify finishes.
 */
export type InstallState = {
  /** {@link INSTALL_STATE_VERSION} this record was written with */
  version: number
  /** hash over the project inputs that determine the installed tree */
  fingerprint: string
  /**
   * The lockfile `options` block the tree was installed with, compared
   * with {@link diffLockfileOptions} so that config coming from the
   * command line or environment is covered too, not just `vlt.json`.
   */
  options: LockfileData['options']
  /**
   * Nodes that still need building. Reported by an install that has
   * nothing else to do, so that skipping the graph load does not also
   * silently skip the "packages have install scripts" trailer.
   */
  buildQueue?: DepID[]
  /** number of nodes in the installed graph, for reporting */
  nodeCount: number
}

export type InstallStateOptions = SpecOptions & {
  projectRoot: string
  modifiers?: GraphModifier
  monorepo?: Monorepo
}

export const installStateFile = (projectRoot: string): string =>
  resolve(projectRoot, 'node_modules/.vlt-install-state.json')

const hiddenLockfileFile = (projectRoot: string): string =>
  resolve(projectRoot, 'node_modules/.vlt-lock.json')

/**
 * Is this install targeting the whole project, or the subset that a
 * `-w`/`--workspace` filter selected? A filtered install neither takes the
 * fast path nor records one, since it only reconciles part of the tree.
 */
export const isUnfilteredInstall = (
  monorepo?: Monorepo,
  fullMonorepo?: Monorepo,
): boolean => (monorepo?.size ?? 0) === (fullMonorepo?.size ?? 0)

/** the relative paths of every workspace in the project, sorted */
const workspacePaths = (monorepo?: Monorepo): string[] =>
  monorepo ? [...monorepo.values()].map(ws => ws.path).sort() : []

const hashFile = (hash: Hash, label: string, file: string): void => {
  hash.update(label)
  hash.update('\0')
  try {
    hash.update(readFileSync(file))
  } catch {
    hash.update('\0missing')
  }
  hash.update('\0')
}

/**
 * Fold in whether an importer still has a `node_modules` directory. The
 * regular path heals a manually deleted one (see `verifyImporterNodeModules`
 * in actual/load.ts), so the fast path must not paper over it.
 */
const hashImporter = (
  hash: Hash,
  projectRoot: string,
  path: string,
): void => {
  hashFile(hash, path, resolve(projectRoot, path, 'package.json'))
  const nm = statSync(resolve(projectRoot, path, 'node_modules'), {
    throwIfNoEntry: false,
  })
  hash.update(nm?.isDirectory() ? 'nm\0' : 'no-nm\0')
}

/**
 * Hash of everything cheap to read that can invalidate an installed tree:
 * the root and workspace manifests, the lockfile, the project config file,
 * and the identity of the hidden lockfile.
 *
 * Returns `undefined` when there is no hidden lockfile, since then there is
 * no record of a completed reify to trust.
 */
export const installFingerprint = (
  options: InstallStateOptions,
): string | undefined => {
  const { projectRoot, monorepo } = options
  // The hidden lockfile is the anchor. Its size and mtime are part of the
  // fingerprint so that anything else writing it invalidates us -- most
  // importantly `vlt build`, which rewrites the build state that the
  // recorded buildQueue is derived from.
  const st = statSync(hiddenLockfileFile(projectRoot), {
    throwIfNoEntry: false,
  })
  if (!st?.isFile()) return undefined
  const hash = createHash('sha512')
  hash.update(`vlt-install-state@${INSTALL_STATE_VERSION}\0`)
  hash.update(`${st.size}\0${st.mtimeMs}\0`)
  hashFile(
    hash,
    'vlt-lock.json',
    resolve(projectRoot, 'vlt-lock.json'),
  )
  hashFile(hash, 'vlt.json', resolve(projectRoot, 'vlt.json'))
  // content, not mtime: an editor rewriting a manifest byte for byte must
  // not invalidate, and a same-mtime change must not be missed.
  hashImporter(hash, projectRoot, '.')
  for (const path of workspacePaths(monorepo)) {
    hashImporter(hash, projectRoot, path)
  }
  return hash.digest('base64')
}

export const loadInstallState = (
  projectRoot: string,
): InstallState | undefined => {
  try {
    const state = JSON.parse(
      readFileSync(installStateFile(projectRoot), 'utf8'),
    ) as InstallState
    /* c8 ignore next - only reachable across a version bump */
    if (state.version !== INSTALL_STATE_VERSION) return undefined
    return state
  } catch {
    return undefined
  }
}

/**
 * Record the state of a finished install, so that the next one can
 * short-circuit if nothing has changed. Best effort: a project we cannot
 * write this for just does not get the fast path.
 *
 * Must be called after every file this install writes, so that the
 * fingerprint describes the tree as it is being left behind.
 */
export const saveInstallState = (
  options: InstallStateOptions & { graph: Graph },
  buildQueue: DepID[],
): void => {
  try {
    const fingerprint = installFingerprint(options)
    /* c8 ignore next - reify always leaves a hidden lockfile behind */
    if (!fingerprint) return
    const state: InstallState = {
      version: INSTALL_STATE_VERSION,
      fingerprint,
      options: currentLockfileOptions(options),
      nodeCount: options.graph.nodes.size,
      ...(buildQueue.length ? { buildQueue } : undefined),
    }
    writeFileSync(
      installStateFile(options.projectRoot),
      JSON.stringify(state),
    )
  } catch {}
}

export const removeInstallState = (projectRoot: string): void => {
  try {
    rmSync(installStateFile(projectRoot), { force: true })
    /* c8 ignore next 2 */
  } catch {}
}

/**
 * Drop the hidden lockfile along with the recorded install state, so that
 * a failed install cannot leave behind a record claiming the tree is in
 * sync with the project.
 */
export const removeHiddenLockfile = (projectRoot: string): void => {
  removeInstallState(projectRoot)
  try {
    rmSync(hiddenLockfileFile(projectRoot), { force: true })
    /* c8 ignore next 2 */
  } catch {}
}

/**
 * The recorded {@link InstallState} when nothing that could affect the
 * installed tree has changed since it was written, otherwise `undefined`.
 */
export const unchangedInstallState = (
  options: InstallStateOptions,
): InstallState | undefined => {
  const state = loadInstallState(options.projectRoot)
  if (!state) return undefined
  if (state.fingerprint !== installFingerprint(options))
    return undefined
  if (diffLockfileOptions(options, state.options).length)
    return undefined
  return state
}
