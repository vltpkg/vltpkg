import { cmdShimIfExists } from '@vltpkg/cmd-shim'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { symlinkSync } from 'node:fs'
import type { symlink } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { Edge } from '../edge.ts'
import { symlinkSyncMkdirp } from './symlink-sync.ts'

const clobberSymlink = async (
  target: string,
  link: string,
  remover: RollbackRemove,
  type: symlink.Type = 'file',
) => {
  // On Windows, directory symlinks require elevated privileges.
  // Use junctions instead, which work without special permissions.
  // Junctions require absolute target paths, so resolve relative targets.
  const symlinkType: symlink.Type =
    type === 'dir' && process.platform === 'win32' ? 'junction' : type
  const symlinkTarget =
    symlinkType === 'junction' ?
      resolve(dirname(link), target)
    : target
  try {
    symlinkSyncMkdirp(symlinkTarget, link, symlinkType)
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
      symlinkSync(symlinkTarget, link, symlinkType)
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
  scurry: PathScurry,
  remover: RollbackRemove,
  bins?: Record<string, string>,
) => {
  if (!edge.to) return
  const { sep } = scurry.cwd
  const nm = edge.from.nodeModules(scurry)
  const binRoot = nm + sep + '.bin'
  const path = nm + sep + edge.spec.name.replace('/', sep)
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

  if (bins) {
    for (const [key, val] of Object.entries(bins)) {
      const link = resolve(binRoot, key)
      const absTarget = resolve(path, val)
      const target = relative(binRoot, absTarget)
      // TODO: bash/cmd/ps1 shims on Windows
      promises.push(
        process.platform === 'win32' ?
          cmdShimIfExists(absTarget, link, remover)
        : clobberSymlink(target, link, remover),
      )
    }
  }
  if (promises.length) await Promise.all(promises)
}
