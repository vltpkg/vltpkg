import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import type { PathScurry } from 'path-scurry'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PeerStoreMove } from './canonicalize-peer-ids.ts'

export const movePeerStoreDirs = async (
  moves: PeerStoreMove[],
  {
    scurry,
    remover,
  }: {
    scurry: PathScurry
    remover: RollbackRemove
  },
): Promise<void> => {
  if (!moves.length) return
  const store = scurry.resolve('node_modules/.vlt')
  await Promise.all(
    moves.map(async ({ node, from, to }) => {
      const src = scurry.resolve(store, from)
      if (!to) return remover.rm(src)
      const dest = scurry.resolve(store, to)
      try {
        // frees the path and registers it for rollback; also the EPERM
        // mitigation Windows needs before renaming a directory
        await remover.rm(dest)
        await rename(src, dest)
      } catch {
        node.extracted = false
        return
      }
      if (!existsSync(node.resolvedLocation(scurry))) {
        node.extracted = false
      }
    }),
  )
}
