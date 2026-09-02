import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import type { PathScurry } from 'path-scurry'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PeerStoreMove } from './canonicalize-peer-ids.ts'
import type { Node } from '../node.ts'

type Staged = {
  node: Node
  tmp: string
  dest: string
}

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
  const key = String(Math.random()).substring(2)

  // phase 1: vacate every source before any destination is written.
  // a canonical id can equal another node's previous id, so a
  // destination may still hold a directory that a sibling move is about
  // to relocate; parking sources on unique hidden paths first keeps the
  // moves from racing each other
  const staged = await Promise.all(
    moves.map(async ({ node, from, to }): Promise<Staged | void> => {
      const src = scurry.resolve(store, from)
      if (!to) return remover.rm(src)
      const tmp = scurry.resolve(store, `.VLT.MOVE.${key}.${to}`)
      try {
        await rename(src, tmp)
      } catch {
        node.extracted = false
        return
      }
      return { node, tmp, dest: scurry.resolve(store, to) }
    }),
  )

  // phase 2: settle each parked directory on its canonical id
  await Promise.all(
    staged.map(async s => {
      if (!s) return
      const { node, tmp, dest } = s
      try {
        // frees the path and registers it for rollback; also the EPERM
        // mitigation Windows needs before renaming a directory
        await remover.rm(dest)
        await rename(tmp, dest)
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
