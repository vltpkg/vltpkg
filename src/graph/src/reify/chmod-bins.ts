import { PackageJson } from '@vltpkg/package-json'
import { chmod } from 'fs/promises'
import { PathScurry } from 'path-scurry'
import { Diff } from '../diff.js'
import { binPaths } from './bin-paths.js'
import { optionalFail } from './optional-fail.js'

export const chmodBins = (
  diff: Diff,
  packageJson: PackageJson,
  scurry: PathScurry,
): (() => Promise<unknown>)[] => {
  // now that the nodes are all unpacked and built, chmod any bins
  const chmodActions: (() => Promise<unknown>)[] = []
  for (const node of diff.nodes.add) {
    const {
      manifest = packageJson.read(scurry.resolve(node.location)),
    } = node
    for (const bin of Object.values(binPaths(manifest))) {
      const path = scurry.resolve(node.location, bin)
      chmodActions.push(() =>
        chmod(path, 0o777).then(x => x, optionalFail(diff, node)),
      )
    }
  }
  return chmodActions
}
