import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Manifest } from '@vltpkg/types'
import { mkdir, symlink } from 'fs/promises'
import { dirname, relative } from 'path'
import { PathScurry } from 'path-scurry'
import { Edge } from '../edge.js'
import { binPaths } from './bin-paths.js'

const clobberSymlink = async (
  target: string,
  link: string,
  remover: RollbackRemove,
  seen: Set<string>,
  type = 'file',
) => {
  // keep a cache of seen items, since all `clobberSymlink` calls for edges
  // being added are run in parallel, the EEXIST catch will not prevent
  // errors in case we're trying to write to that same destination within a
  // unique `reify.addEdges` run.
  if (seen.has(link)) return
  seen.add(link)

  await mkdir(dirname(link), { recursive: true })
  try {
    await symlink(target, link, type)
  } catch (e) {
    const er = e as NodeJS.ErrnoException
    if (er.code === 'EEXIST') {
      return remover.rm(link).then(() => symlink(target, link))
      /* c8 ignore start */
    } else {
      throw er
    }
  }
  /* c8 ignore stop */
}

/**
 * reify an edge into a node_modules folder, with bins linked
 * this does NOT chmod the bins to 0o777, because they might not exist
 * until scripts are run, in the case of non-store deps like workspaces
 */
export const addEdge = async (
  edge: Edge,
  manifest: Manifest,
  scurry: PathScurry,
  remover: RollbackRemove,
  seen: Set<string>,
) => {
  if (!edge.to) return
  const binRoot = scurry.resolve(edge.from.nodeModules, '.bin')
  const path = scurry.resolve(edge.from.nodeModules, edge.spec.name)
  const promises: Promise<unknown>[] = []
  const target = relative(
    dirname(path),
    scurry.resolve(edge.to.location),
  )
  promises.push(clobberSymlink(target, path, remover, seen, 'dir'))
  const bp = binPaths(manifest)
  for (const [key, val] of Object.entries(bp)) {
    const link = scurry.resolve(binRoot, key)
    const target = relative(binRoot, scurry.resolve(path, val))
    // TODO: bash/cmd/pwsh shims on Windows
    promises.push(clobberSymlink(target, link, remover, seen))
  }
  await Promise.all(promises)
}
