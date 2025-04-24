import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { basename } from 'node:path'
import type { VlxOptions } from './index.ts'
import { vlxInfo } from './info.ts'
import { vlxList } from './list.ts'

const keyMatch = (keys: string[], path: string): boolean => {
  if (!keys.length) return true
  for (const k of keys) {
    if (path.includes(k)) return true
  }
  return false
}

export const vlxDelete = async (
  keys: string[],
  remover: RollbackRemove,
  options: VlxOptions,
) => {
  const removed: string[] = []
  const promises: Promise<void>[] = []
  for await (const p of vlxList()) {
    // if the request for info fails, delete it
    const key = basename(p)
    try {
      vlxInfo(p, options)
      if (keyMatch(keys, key)) {
        promises.push(remover.rm(p))
        removed.push(key)
      }
    } catch {
      // delete if no good
      promises.push(remover.rm(p))
      removed.push(key)
    }
  }
  await Promise.all(promises)
  return removed
}
