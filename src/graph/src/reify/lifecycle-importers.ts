import { PackageJson } from '@vltpkg/package-json'
import { run } from '@vltpkg/run'
import { graphRun } from 'graph-run'
import { Diff } from '../diff.js'
import { Node } from '../node.js'
import { nonEmptyList } from '../non-empty-list.js'

export const lifecycleImporters = async (
  diff: Diff,
  packageJson: PackageJson,
  projectRoot: string,
) => {
  const actual = diff.from
  const graph = diff.to

  // also attempt to run scripts for any importer that wasn't reified,
  // but had dependencies change in any way.
  const importersWithChangedDeps = nonEmptyList(
    [...graph.importers].filter(node => {
      // if part of the additions, not relevant, already built
      const actualImp = actual.nodes.get(node.id)
      if (!actualImp) return true
      for (const [name, edgeOut] of actualImp.edgesOut) {
        const idealEdge = node.edgesOut.get(name)
        // if the edge is being removed, that's a change
        /* c8 ignore next */
        if (!idealEdge) return true

        // if one is missing, that's a change unless the other also is
        if (!!idealEdge.to !== !!edgeOut.to) return true

        /* c8 ignore start - covered by previous conditions irl */
        if (!!edgeOut.to && !idealEdge.to?.equals(edgeOut.to)) {
          return true
        }
        /* c8 ignore end */
      }

      // now scan for any new edges added
      for (const name of node.edgesOut.keys()) {
        if (!actualImp.edgesOut.get(name)) return true
      }

      return false
    }),
  )

  if (importersWithChangedDeps) {
    const set = new Set(importersWithChangedDeps)
    await graphRun({
      graph: importersWithChangedDeps,
      getDeps: node => {
        const deps: Node[] = []
        for (const { to } of node.edgesOut.values()) {
          /* c8 ignore next - vanishingly unlikely in practice */
          if (to && set.has(to)) deps.push(to)
        }
        return deps
      },
      visit: async node => {
        const { manifest, location: cwd } = node
        await run({
          arg0: 'install',
          ignoreMissing: true,
          packageJson,
          cwd,
          projectRoot,
          manifest,
        })
        await run({
          arg0: 'prepare',
          ignoreMissing: true,
          packageJson,
          cwd,
          projectRoot,
          manifest,
        })
      },
    })
  }
}
