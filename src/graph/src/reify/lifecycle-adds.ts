import { PackageJson } from '@vltpkg/package-json'
import { run } from '@vltpkg/run'
import { graphRun } from 'graph-run'
import { Diff } from '../diff.js'
import { Node } from '../node.js'
import { nonEmptyList } from '../non-empty-list.js'

// run install lifecycle script for all installed deps, in dep graph order
// plus prepare for all importers and git deps
// Note: this is a bit different from the order in which npm runs these
// scripts. Rather than running ALL preinstall, then ALL installs, then
// ALL postinstalls, we run preinstall/install/postinstall for each node
// in sequence, attempting to do so only after their dependencies have had
// the same treatment. For git deps and importers, we then also run
// prepare.
export const lifecycleAdds = async (
  diff: Diff,
  packageJson: PackageJson,
  projectRoot: string,
) => {
  const adds = nonEmptyList([...diff.nodes.add])
  if (adds) {
    await graphRun({
      graph: adds,
      getDeps: node => {
        const deps: Node[] = []
        for (const { to } of node.edgesOut.values()) {
          if (to) deps.push(to)
        }
        return deps
      },
      visit: async node => {
        const { location: cwd, manifest } = node
        // TODO: if the dep is optional, let it fail?
        // then remove it etc.
        await run({
          arg0: 'install',
          ignoreMissing: true,
          packageJson,
          cwd,
          projectRoot,
          manifest,
        })
        // have to also run prepare for all the git deps, but only
        // *after* their deps are prepared, and pre/post install runs
        if (node.id.startsWith('git;') || !node.inVltStore()) {
          await run({
            arg0: 'prepare',
            ignoreMissing: true,
            packageJson,
            cwd,
            projectRoot,
            manifest,
          })
        }
      },
    })
  }
}
