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

export type UpdateOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  allowScripts: string
}

/**
 * Graph to update from. `-w` filtered: the lockfile (else installed)
 * graph minus the selected workspaces' deps, so only those re-resolve
 * (deps shared with other workspaces stay locked). Else: empty.
 */
const startingGraph = (
  options: LoadOptions & { mainManifest: NormalizedManifest },
  monorepo?: Monorepo,
) => {
  const fresh = () => new Graph({ ...options, monorepo })
  if (!options.monorepo || !monorepo) return fresh()
  const selected = new Set(
    [...options.monorepo.values()].map(ws => ws.id),
  )
  if (selected.size === monorepo.size) return fresh()
  let graph: Graph
  try {
    graph = loadVirtual({ ...options, monorepo })
  } catch (err) {
    if (isPathSecurityError(err)) throw err
    graph = actualLoad({ ...options, monorepo, loadManifests: true })
  }
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

export const update = async (options: UpdateOptions) => {
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

  try {
    const done = graphStep('build')
    const graph = await buildIdealFromStartingGraph({
      ...options,
      add: Object.assign(new Map(), { modifiedDependencies: false }),
      remove: Object.assign(new Map(), {
        modifiedDependencies: false,
      }),
      graph: startingGraph(
        { ...options, mainManifest, modifiers },
        monorepo,
      ),
      modifiers,
      remover,
    })
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

    return { buildQueue, graph, diff }
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
}
