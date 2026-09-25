import { resolve } from 'node:path'

/** Global store root under the cache folder `cache`. */
export const storeRoot = (cache: string) =>
  resolve(cache, 'store', 'v1')
