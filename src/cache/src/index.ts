import { createHash, randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { LRUCache } from 'lru-cache'
import { resolve } from 'node:path'
import { basename, dirname } from 'path'

export type CacheOptions = {
  [k in keyof LRUCache.Options<
    string | Buffer,
    Buffer,
    undefined
  >]?: LRUCache.Options<string | Buffer, Buffer, undefined>[k]
} & {
  fetchMethod?: undefined
  path: string
}

const hash = (s: string | Buffer) =>
  createHash('sha-512').update(s).digest('hex')

const path = (h: string) =>
  `${h.substring(0, 2)}/${h.substring(2, 4)}/${h}`

export class Cache extends LRUCache<
  string | Buffer,
  Buffer,
  undefined
> {
  #path: string;
  [Symbol.toStringTag]: string = '@vltpkg/cache.Cache'
  #random: string = randomBytes(6).toString('hex')
  #pending: Set<Promise<void>> = new Set()

  get pending() {
    return [...this.#pending]
  }

  static get defaultTTL() {
    return 1000 * 60 * 15
  }
  static get defaultMax() {
    return 1000
  }

  constructor(options: CacheOptions) {
    const {
      path,
      fetchMethod: _,
      sizeCalculation = options.maxSize || options.maxEntrySize ?
        (v: Buffer, k: string | Buffer) => v.length + k.length
      : undefined,
      ...lruOpts
    } = options

    super({
      // time to cache in memory
      // disk-cache is permanent
      ttl: Cache.defaultTTL,
      max: Cache.defaultMax,
      ...lruOpts,
      sizeCalculation,
      fetchMethod: async (k, v, opts) => this.#diskRead(k, v, opts),
      allowStaleOnFetchRejection: true,
      allowStaleOnFetchAbort: true,
      allowStale: true,
      noDeleteOnStaleGet: true,
    })
    this.#path = options.path
  }

  set(
    key: Buffer | string,
    val: Buffer,
    options: LRUCache.SetOptions<
      Buffer | string,
      Buffer,
      undefined
    > = ({} = {}),
  ) {
    super.set(key, val, options)
    // best effort, already have it in memory
    /* c8 ignore next */
    const p: Promise<void> = this.#diskWrite(key, val)
      .catch(() => {})
      .then(() => {
        this.#pending.delete(p)
      })
    this.#pending.add(p)
    return this
  }

  /**
   * Resolves when there are no pending writes to the disk cache
   */
  promise(): Promise<void> {
    return new Promise(async res => {
      await Promise.all(this.pending)
      /* c8 ignore next - race condition */
      this.#pending.size ? res(this.promise()) : res()
    })
  }

  path(key: Buffer | string) {
    return resolve(this.#path, path(hash(key)))
  }

  /**
   * Read synchronously from the fs cache storage if not already
   * in memory.
   */
  fetchSync(
    key: Buffer | string,
    opts?: LRUCache.FetchOptions<string | Buffer, Buffer, undefined>,
  ) {
    const v = this.get(key)
    if (v) return v
    try {
      const v = readFileSync(this.path(key))
      this.set(key, v, opts)
      return v
      /* c8 ignore next */
    } catch {}
  }

  async #diskWrite(key: Buffer | string, val: Buffer) {
    const path = this.path(key)
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })
    const base = basename(path)
    const tmp = dir + '.' + base + '.' + this.#random
    await writeFile(tmp, val)
    await rename(tmp, path)
  }

  async #diskRead(
    k: string | Buffer,
    v: Buffer | undefined,
    opts: LRUCache.FetcherOptions<string | Buffer, Buffer, undefined>,
  ) {
    return readFile(this.path(k), opts).catch(() => v)
  }
}
