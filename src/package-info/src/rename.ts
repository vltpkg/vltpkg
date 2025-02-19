/**
 * On posix systems, rename is atomic and will clobber anything in its way
 * However, on Windows, it can fail with the rather unhelpful EPERM error if
 * the target directory is not removed in time or is currently in use.
 *
 * While true atomic semantics is not available on Windows in this case, we can
 * at least implement the posix overwrite semantics by explicitly removing the
 * target when this error occurs.
 *
 * This is only relevant when renaming *directories*, since files will
 * generally not raise problems. When/if we rename directories outside of
 * package-info, this can be moved to its own shared module.
 * @module
 */
const { platform } = process
import type { PathLike } from 'node:fs'
import { rename as fsRename, rm } from 'node:fs/promises'
export const rename =
  platform !== 'win32' ? fsRename : (
    async function (
      oldPath: PathLike,
      newPath: PathLike,
    ): Promise<void> {
      let retries = 3
      const retry = async (er: unknown): Promise<void> => {
        if (
          retries > 0 &&
          (er as NodeJS.ErrnoException).code === 'EPERM'
        ) {
          retries--
          await rm(newPath, { recursive: true, force: true })
          return fsRename(oldPath, newPath).then(() => {}, retry)
        } else {
          throw er
        }
      }
      return fsRename(oldPath, newPath).then(() => {}, retry)
    }
  )
