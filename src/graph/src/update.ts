import { load as actualLoad } from './actual/load.ts'
import { buildIdealFromStartingGraph } from './ideal/build-ideal-from-starting-graph.ts'
import { reify } from './reify/index.ts'
import { GraphModifier } from './modifiers.ts'
import { init } from '@vltpkg/init'
import { asError } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import { Graph } from './graph.ts'
import { load as loadVirtual } from './lockfile/load.ts'
import { isPathSecurityError } from './path-security-error.ts'
import { graphStep } from '@vltpkg/output'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Monorepo } from '@vltpkg/workspaces'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { baseDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { Diff } from './diff.ts'
import {
  assertQuery,
  filterNodesByQuery,
} from './filter-nodes-by-query.ts'
import { error } from '@vltpkg/error-cause'
import { assertSkillsDirs } from './skills/dirs.ts'
import type { LinkSkillsResult } from './skills/index.ts'

export type UpdateOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  allowScripts: string
  /**
   * DSS query: only matching deps re-resolve, everything else keeps
   * its locked version. Unset: update all.
   */
  target?: string
  /**
   * DSS query: packages whose agent skills get linked into the
   * project's agent skill dirs after update. Selectors may end with
   * `:skill()`. Unset or `:not(*)`: none.
   */
  allowSkills?: string
  /**
   * agent skill dirs, relative to projectRoot. Unset: detect; `[]`:
   * none
   */
  skillsDirs?: string[]
}

/**
 * Result of {@link update}.
 */
export type UpdateResult = {
  buildQueue?: DepID[]
  graph: Graph
  diff?: Diff
  /** skill links added or removed, if any */
  skills?: LinkSkillsResult
}

/**
 * The lockfile graph, else the installed one. `actual`: manifests for
 * lockfile nodes.
 */
const lockedGraph = (
  options: LoadOptions & { mainManifest: NormalizedManifest },
  monorepo?: Monorepo,
  actual?: Graph,
) => {
  try {
    return loadVirtual({ ...options, monorepo, actual })
  } catch (err) {
    if (isPathSecurityError(err)) throw err
    return (
      actual ??
      actualLoad({ ...options, monorepo, loadManifests: true })
    )
  }
}

/** ids of the `-w` selected workspaces, if filtered */
const selectedWorkspaces = (
  options: LoadOptions,
  monorepo?: Monorepo,
) => {
  if (!options.monorepo || !monorepo) return
  const selected = new Set(
    [...options.monorepo.values()].map(ws => ws.id),
  )
  return selected.size === monorepo.size ? undefined : selected
}

/**
 * Graph to update from. `target`: the locked graph minus the matching
 * deps; edges to them re-resolve. `-w` filtered: the locked graph
 * minus the selected workspaces' deps, so only those re-resolve (deps
 * shared with other workspaces stay locked). Else: empty.
 */
const startingGraph = async (
  options: LoadOptions & {
    mainManifest: NormalizedManifest
    target?: string
  },
  monorepo?: Monorepo,
) => {
  const fresh = () => new Graph({ ...options, monorepo })
  if (options.target) {
    // installed manifests, for selectors that read them
    const actual = actualLoad({
      ...options,
      monorepo,
      loadManifests: true,
    })
    const graph = lockedGraph(options, monorepo, actual)
    const ids = await filterNodesByQuery(graph, options.target, true)
    const unlocked = new Set<string>()
    for (const node of [...graph.nodes.values()]) {
      if (node.importer || !ids.has(node.id)) continue
      for (const edge of node.edgesIn) {
        unlocked.add(`${baseDepID(edge.from.id)}\0${edge.spec.name}`)
      }
      graph.removeNode(node, undefined, true)
    }
    if (unlocked.size) graph.unlockedEdges = unlocked
    return graph
  }
  const selected = selectedWorkspaces(options, monorepo)
  if (!selected) return fresh()
  const graph = lockedGraph(options, monorepo)
  for (const importer of graph.importers) {
    if (!selected.has(importer.id)) continue
    for (const edge of importer.edgesOut.values()) {
      edge.to?.edgesIn.delete(edge)
    }
    importer.edgesOut.clear()
  }
  graph.gc()
  return graph
}

export const update = async (
  options: UpdateOptions,
): Promise<UpdateResult> => {
  // unset or `:not(*)`: no skills work at all, the skills code never
  // loads
  const allowSkills =
    options.allowSkills === ':not(*)' ?
      undefined
    : options.allowSkills
  // fail before updating, not after
  if (allowSkills) {
    await assertQuery(allowSkills, 'allow-skills', ['skill'])
    assertSkillsDirs(options.projectRoot, options.skillsDirs)
  }
  if (options.target) await assertQuery(options.target, 'target')
  let mainManifest: NormalizedManifest | undefined = undefined
  try {
    mainManifest = options.packageJson.read(options.projectRoot)
  } catch (err) {
    if (asError(err).message === 'Could not read package.json file') {
      await init({ cwd: options.projectRoot })
      mainManifest = options.packageJson.read(options.projectRoot, {
        reload: true,
      })
    } else {
      throw err
    }
  }

  const modifiers = GraphModifier.maybeLoad(options)
  const remover = new RollbackRemove()
  const monorepo = Monorepo.maybeLoad(options.projectRoot, {
    packageJson: options.packageJson,
    scurry: options.scurry,
  })

  if (options.target && selectedWorkspaces(options, monorepo)) {
    throw error(
      'Cannot combine a package selection with --workspace or --workspace-group',
      { code: 'EUSAGE', found: options.target },
    )
  }

  let result: UpdateResult
  try {
    const done = graphStep('build')
    const start = await startingGraph(
      { ...options, mainManifest, modifiers },
      monorepo,
    )
    const graph = await buildIdealFromStartingGraph({
      ...options,
      add: Object.assign(new Map(), { modifiedDependencies: false }),
      remove: Object.assign(new Map(), {
        modifiedDependencies: false,
      }),
      graph: start,
      modifiers,
      remover,
      // re-resolved edges below importers need a full rebuild
      rebuild: !!start.unlockedEdges,
    })
    start.unlockedEdges = undefined
    done()

    const act = actualLoad({
      ...options,
      monorepo,
      mainManifest,
      loadManifests: true,
    })

    const { buildQueue, diff } = await reify({
      ...options,
      actual: act,
      graph,
      loadManifests: true,
      modifiers,
      remover,
      update: true,
    })

    result = { buildQueue, graph, diff }
    /* c8 ignore start */
  } catch (err) {
    await remover.rollback().catch(() => {})
    // Remove hidden lockfile on failure
    try {
      const hiddenLockfile = resolve(
        options.projectRoot,
        'node_modules/.vlt-lock.json',
      )
      if (existsSync(hiddenLockfile)) {
        rmSync(hiddenLockfile, { force: true })
      }
    } catch {}
    throw err
  }
  /* c8 ignore stop */

  // after the try: a link failure must not roll back the update
  if (!allowSkills) return result
  const { linkSkills } = await import('./skills/index.ts')
  result.skills = await linkSkills({
    ...options,
    graph: result.graph,
    target: allowSkills,
  })
  return result
}
