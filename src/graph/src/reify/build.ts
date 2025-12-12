// walk the graph of added nodes, building and chmoding their bins
// at the end, we get back to the importers, and run their prepare
// script as well as install script.

import type { PackageJson } from '@vltpkg/package-json'
import { run } from '@vltpkg/run'
import { graphRun } from '@vltpkg/graph-run'
import type { PathScurry } from 'path-scurry'
import type { DepID } from '@vltpkg/dep-id'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { nonEmptyList } from '../non-empty-list.ts'
import { optionalFail } from './optional-fail.ts'
import { binChmod } from './bin-chmod.ts'

/**
 * Returns an object mapping registries to the names of the packages built.
 */
export type BuildResult = {
  success: Node[]
  failure: Node[]
}

export const build = async (
  diff: Diff,
  packageJson: PackageJson,
  scurry: PathScurry,
  allowScriptsNodes: Set<DepID>,
): Promise<BuildResult> => {
  const graph = diff.to
  const nodes = nonEmptyList([...graph.importers])
  const res: BuildResult = { success: [], failure: [] }

  // determine if scripts should run - check if node is in allowed set
  const shouldRunScripts = (node: Node): boolean =>
    allowScriptsNodes.has(node.id)

  /* c8 ignore next - all graphs have at least one importer */
  if (!nodes) return res

  await graphRun<Node, unknown>({
    graph: nodes,
    visit: async (node: Node, signal, path) => {
      // if it's not an importer or an added node, nothing to do.
      // TODO: only build importers if it has changed deps, there's never
      // been a previous build, or it contains something newer than the
      // most recent build.
      // For now, just always build all importers, because we don't
      // track all that other stuff.

      if (
        !node.importer &&
        (!diff.nodes.add.has(node) || !shouldRunScripts(node))
      )
        return

      try {
        await visit(packageJson, scurry, node, signal, path)
        if (!node.importer) {
          node.buildState = 'built'
          res.success.push(node)
        }
        /* c8 ignore start - windows on CI is missing those tests */
      } catch (err) {
        // Check if this is an optional failure that was handled
        if (node.optional) {
          node.buildState = 'failed'
          res.failure.push(node)
          // Let optionalFail handle the error
          await Promise.reject(err).catch(optionalFail(diff, node))
        } else {
          // Re-throw non-optional failures
          throw err
        }
      }
      /* c8 ignore stop */
    },

    getDeps: node => {
      const deps: Node[] = []
      for (const { to } of node.edgesOut.values()) {
        /* c8 ignore next - vanishingly unlikely in practice */
        if (to) deps.push(to)
      }
      return deps
    },
  })

  return res
}

const visit = async (
  packageJson: PackageJson,
  scurry: PathScurry,
  node: Node,
  signal: AbortSignal,
  _path: Node[],
): Promise<void> => {
  // at this point we might have to read the manifest from disk if it's
  // currently nullish, that could happen in a scenario where the ideal
  // graph is from a lockfile and there's no actual graph available
  // to hydrate the manifest data from.
  node.manifest ??= packageJson.read(node.resolvedLocation(scurry))
  const { manifest } = node
  const { scripts = {} } = manifest

  const {
    install,
    preinstall,
    postinstall,
    prepare,
    preprepare,
    postprepare,
  } = scripts

  // if it has install script, run it
  const runInstall = !!(install || preinstall || postinstall)
  if (runInstall) {
    await run({
      signal,
      arg0: 'install',
      ignoreMissing: true,
      packageJson,
      cwd: node.resolvedLocation(scurry),
      projectRoot: node.projectRoot,
      manifest,
    })
  }

  // if it's an importer or git, run prepare
  const prepable =
    node.id.startsWith('git') || node.importer || !node.inVltStore()
  const runPrepare =
    !!(prepare || preprepare || postprepare) && prepable

  if (runPrepare) {
    await run({
      signal,
      arg0: 'prepare',
      ignoreMissing: true,
      packageJson,
      cwd: node.resolvedLocation(scurry),
      projectRoot: node.projectRoot,
      manifest,
    })
  }

  await binChmod(node, scurry)
}
