import { hydrate } from '@vltpkg/dep-id'
import { PackageInfoClient } from '@vltpkg/package-info'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { SpecOptions } from '@vltpkg/spec'
import { PathScurry } from 'path-scurry'
import { Diff } from '../diff.js'
import { optionalFail } from './optional-fail.js'

export const addNodes = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
  options: SpecOptions,
  packageInfo: PackageInfoClient,
) => {
  const promises: Promise<unknown>[] = []
  // fetch and extract all the nodes, removing any in the way
  for (const node of diff.nodes.add) {
    // if it's not in the store, we don't have to extract it, because
    // we're just linking to a location that already exists.
    if (!node.inVltStore()) continue
    // remove anything already there
    const target = scurry.resolve(node.location)
    const from = scurry.resolve('')
    const spec = hydrate(node.id, node.manifest?.name, options)
    const onErr = optionalFail(diff, node)
    promises.push(
      remover
        .rm(target)
        .then(() =>
          packageInfo
            .extract(spec, target, { from })
            .then(x => x, onErr),
        ),
    )
  }
  return promises
}
