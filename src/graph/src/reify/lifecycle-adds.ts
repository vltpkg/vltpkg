import { PackageJson } from '@vltpkg/package-json'
import { run } from '@vltpkg/run'
import { Manifest } from '@vltpkg/types'
import { graphRun } from 'graph-run'
import { Diff } from '../diff.js'
import { Node } from '../node.js'
import { nonEmptyList } from '../non-empty-list.js'
import { optionalFail } from './optional-fail.js'

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
      visit: async node =>
        visit(
          node,
          packageJson,
          node.location,
          projectRoot,
          node.manifest,
        ).then(x => x, optionalFail(diff, node)),
    })
  }
}

const visit = async (
  node: Node,
  packageJson: PackageJson,
  cwd: string,
  projectRoot: string,
  manifest?: Manifest,
) => {
  await run({
    arg0: 'install',
    ignoreMissing: true,
    packageJson,
    cwd,
    projectRoot,
    manifest,
  })

  // also run prepare for all the git deps
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
}
