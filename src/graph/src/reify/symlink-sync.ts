import { mkdirSync, symlinkSync } from 'node:fs'
import type { symlink } from 'node:fs'
import { dirname } from 'node:path'

/**
 * `symlinkSync`, creating the parent dir on ENOENT.
 */
export const symlinkSyncMkdirp = (
  target: string,
  link: string,
  type?: symlink.Type,
) => {
  try {
    symlinkSync(target, link, type)
  } catch (er) {
    if ((er as NodeJS.ErrnoException).code !== 'ENOENT') throw er
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(target, link, type)
  }
}
