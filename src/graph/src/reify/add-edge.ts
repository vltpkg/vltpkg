import { cmdShimIfExists } from '@vltpkg/cmd-shim'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { Manifest } from '@vltpkg/types'
import { mkdir, symlink } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Edge } from '../edge.ts'
import { binPaths } from './bin-paths.ts'

const clobberSymlink = async (
  target: string,
  link: string,
  remover: RollbackRemove,
  type = 'file',
) => {
  await mkdir(dirname(link), { recursive: true })
  try {
    await symlink(target, link, type)
  } catch (er) {
    /* c8 ignore start */
    if ((er as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw er
    }
    /* c8 ignore stop */

    // if the symlink exists, remove it
    await remover.rm(link)

    try {
      // then try to create it again
      await symlink(target, link, type)
      /* c8 ignore start */
    } catch (er) {
      // if the symlink still exists, then multiple paths could be writing to it
      // so now just ignore that error. See https://github.com/vltpkg/vltpkg/issues/797
      if ((er as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw er
      }
    }
    /* c8 ignore stop */
  }
}

/**
 * reify an edge into a node_modules folder, with bins linked
 * this does NOT chmod the bins to 0o777, because they might not exist
 * until scripts are run, in the case of non-store deps like workspaces
 */
export const addEdge = async (
  edge: Edge,
  manifest: Pick<Manifest, 'bin'>,
  scurry: PathScurry,
  remover: RollbackRemove,
) => {
  if (!edge.to) return
  const binRoot = scurry.resolve(
    edge.from.nodeModules(scurry),
    '.bin',
  )
  const path = scurry.resolve(
    edge.from.nodeModules(scurry),
    edge.spec.name,
  )
  const promises: Promise<unknown>[] = []
  const target = relative(
    dirname(path),
    edge.to.resolvedLocation(scurry),
  )

  // can only parallelize this on posix, because the win32 shims
  // need to know that they will exist before being created.
  const p = clobberSymlink(target, path, remover, 'dir')
  if (process.platform === 'win32') await p
  else promises.push(p)

  const bp = binPaths(manifest)
  for (const [key, val] of Object.entries(bp)) {
    const link = scurry.resolve(binRoot, key)
    const absTarget = scurry.resolve(path, val)
    const target = relative(binRoot, absTarget)
    // TODO: bash/cmd/ps1 shims on Windows
    promises.push(
      process.platform === 'win32' ?
        cmdShimIfExists(absTarget, link, remover)
      : clobberSymlink(target, link, remover),
    )
  }
  if (promises.length) await Promise.all(promises)
}
