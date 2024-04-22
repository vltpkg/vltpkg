import { realpathSync } from 'node:fs'

let localRealPathCache: Map<string, string> = new Map()

/**
 * Returns the realpath for a given symlink path.
 */
export const realpath = (path: string): string => {
  const cacheRes = localRealPathCache.get(path)
  if (cacheRes) {
    return cacheRes
  }
  const res = realpathSync(path)
  localRealPathCache.set(path, res)
  return res
}
