import { lstat } from 'node:fs/promises'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PathScurry } from 'path-scurry'

const checked = new Set<string>()

/**
 * Every name/location check in the graph is lexical, so if the store dirs
 * are symlinks the writes land wherever they point. Remove anything in
 * their place that is not a directory. One syscall per distinct dir.
 */
export const ensureStoreDirs = async (
  scurry: PathScurry,
  remover: RollbackRemove,
): Promise<void> => {
  for (const dir of ['node_modules', 'node_modules/.vlt']) {
    const path = scurry.resolve(dir)
    if (checked.has(path)) continue
    checked.add(path)
    const st = await lstat(path).catch(() => undefined)
    if (st && !st.isDirectory()) await remover.rm(path)
  }
}
