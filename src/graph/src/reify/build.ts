// walk the graph of added nodes, building and chmoding their bins
// at the end, we get back to the importers, and run their prepare
// script as well as install script.

import type { PackageJson } from '@vltpkg/package-json'
import { run } from '@vltpkg/run'
import { statSync, existsSync } from 'node:fs'
import { chmod } from 'node:fs/promises'
import { graphRun } from 'graph-run'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import type { Node } from '../node.ts'
import { nonEmptyList } from '../non-empty-list.ts'
import { binPaths } from './bin-paths.ts'
import { optionalFail } from './optional-fail.ts'

export const build = async (
  diff: Diff,
  packageJson: PackageJson,
  scurry: PathScurry,
) => {
  const graph = diff.to
  const nodes = nonEmptyList([...graph.importers])
  /* c8 ignore next - all graphs have at least one importer */
  if (!nodes) return

  await graphRun<Node, unknown>({
    graph: nodes,
    visit: async (node: Node, signal, path) => {
      // if it's not an importer or an added node, nothing to do.
      // TODO: only build importers if it has changed deps, there's never
      // been a previous build, or it contains something newer than the
      // most recent build.
      // For now, just always build all importers, because we don't
      // track all that other stuff.
      if (!node.importer && !diff.nodes.add.has(node)) return

      await visit(packageJson, scurry, node, signal, path).then(
        x => x,
        optionalFail(diff, node),
      )
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
}

const visit = async (
  packageJson: PackageJson,
  scurry: PathScurry,
  node: Node,
  signal: AbortSignal,
  _path: Node[],
): Promise<void> => {
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

  const chmods: Promise<unknown>[] = []
  for (const bin of Object.values(binPaths(manifest))) {
    const path = scurry.resolve(
      `${node.resolvedLocation(scurry)}/${bin}`,
    )
    // only try to make executable if the file exists
    if (existsSync(path)) {
      chmods.push(makeExecutable(path))
    }
  }
  await Promise.all(chmods)
}

// 0 is "not yet set"
// This is defined by doing `0o111 | <mode>` so that systems
// that create files group-writable result in 0o775 instead of 0o755
let execMode = 0
const makeExecutable = async (path: string) => {
  if (!execMode) {
    execMode = (statSync(path).mode & 0o777) | 0o111
  }
  await chmod(path, execMode)
}
