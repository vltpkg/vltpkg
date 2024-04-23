import { createHash, randomBytes } from 'crypto'
import { readdirSync, readFileSync } from 'fs'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'fs/promises'
import { LRUCache } from 'lru-cache'
import { resolve } from 'node:path'
import { basename, dirname } from 'path'
import { rimraf } from 'rimraf'

export type CacheOptions = {
  [k in keyof LRUCache.Options<
    string,
    Buffer,
    undefined
  >]?: LRUCache.Options<string, Buffer, undefined>[k]
} & {
  /**
   * fetchMethod may not be provided, because this cache forces its own
   * read-from-disk as the fetchMethod
   */
  fetchMethod?: undefined
  /**
   * folder where items should be stored to disk
   */
  path: string
  /**
   * called whenever an item is written to disk.
   */
  onDiskWrite?: (path: string, key: string, data: Buffer) => any
  /**
   * called whenever an item is deleted with `cache.delete(key, true)`
   * Deletes of the in-memory data do not trigger this method.
   */
  onDiskDelete?: (path: string, key: string, deleted: boolean) => any
}

const hash = (s: string) =>
  createHash('sha512').update(s).digest('hex')

const path = (h: string) =>
  `${h.substring(0, 2)}/${h.substring(2, 4)}/${h}`

export class Cache extends LRUCache<string, Buffer, undefined> {
  #path: string;
  [Symbol.toStringTag]: string = '@vltpkg/cache.Cache'
  #random: string = randomBytes(6).toString('hex')
  #pending: Set<Promise<void | boolean>> = new Set()
  onDiskWrite?: CacheOptions['onDiskWrite']
  onDiskDelete?: CacheOptions['onDiskDelete']

  /**
   * A list of the actions currently happening in the background
   */
  get pending() {
    return [...this.#pending]
  }

  /**
   * By default, cache up to 1000 items in memory.
   * Disk cache is unbounded.
   */
  static get defaultMax() {
    return 1000
  }

  constructor(options: CacheOptions) {
    const {
      onDiskWrite,
      onDiskDelete,
      path,
      fetchMethod: _,
      sizeCalculation = options.maxSize || options.maxEntrySize ?
        (v: Buffer, k: string) => v.length + k.length
      : undefined,
      ...lruOpts
    } = options

    super({
      max: Cache.defaultMax,
      ...lruOpts,
      sizeCalculation,
      fetchMethod: async (k, v, opts) => {
        // do not write back to disk, since we just got it from there.
        Object.assign(opts.options, { noDiskWrite: true })
        return this.#diskRead(k, v)
      },
      allowStaleOnFetchRejection: true,
      allowStaleOnFetchAbort: true,
      allowStale: true,
      noDeleteOnStaleGet: true,
    })
    this.onDiskWrite = onDiskWrite
    this.onDiskDelete = onDiskDelete
    this.#path = path
  }

  /**
   * Walk over all the items cached to disk (not just in memory).
   * Useful for cleanup, pruning, etc.
   *
   * Implementation for `for await` to walk over entries.
   */
  async *walk() {
    for (const a of await readdir(this.#path)) {
      for (const b of await readdir(resolve(this.#path, a))) {
        for (const f of await readdir(resolve(this.#path, a, b))) {
          if (f.endsWith('.key')) {
            yield (await Promise.all([
              readFile(resolve(this.#path, a, b, f), 'utf8'),
              readFile(
                resolve(
                  this.#path,
                  a,
                  b,
                  f.substring(0, f.length - '.key'.length),
                ),
              ),
            ])) as [string, Buffer]
          }
        }
      }
    }
  }
  [Symbol.asyncIterator](): AsyncGenerator<
    [string, Buffer],
    void,
    void
  > {
    return this.walk()
  }

  /**
   * Synchronous form of Cache.walk()
   */
  *walkSync() {
    for (const a of readdirSync(this.#path)) {
      for (const b of readdirSync(resolve(this.#path, a))) {
        for (const f of readdirSync(resolve(this.#path, a, b))) {
          if (f.endsWith('.key')) {
            yield [
              readFileSync(resolve(this.#path, a, b, f), 'utf8'),
              readFileSync(
                resolve(
                  this.#path,
                  a,
                  b,
                  f.substring(0, f.length - '.key'.length),
                ),
              ),
            ] as [string, Buffer]
          }
        }
      }
    }
  }
  [Symbol.iterator]() {
    return this.walkSync()
  }

  #unpend<F extends (...a: any[]) => any>(
    p: Promise<any>,
    fn: F | undefined,
    ...args: Parameters<F>
  ) {
    this.#pending.delete(p)
    if (fn) fn(...args)
  }

  #pend(p: Promise<any>) {
    this.#pending.add(p)
  }

  /**
   * Pass `true` as second argument to delete not just from the in-memory
   * cache, but the disk backing as well.
   */
  delete(key: string, fromDisk: boolean = false): boolean {
    const ret = super.delete(key)
    if (fromDisk) {
      const path = this.path(key)
      const p: Promise<void> = this.#diskDelete(path).then(deleted =>
        this.#unpend(p, this.onDiskDelete, path, key, deleted),
      )
      this.#pend(p)
    }
    return ret
  }

  /**
   * Sets an item in the memory cache (like `LRUCache.set`), and schedules a
   * background operation to write it to disk.
   *
   * Use the {@link CacheOptions#onDiskWrite} method to know exactly when this
   * happens, or `await cache.promise()` to defer until all pending actions are
   * completed.
   *
   * The `noDiskWrite` option can be set to prevent it from writing back to the
   * disk cache. This is almost never relevant for consumers, and is used
   * internally to prevent the write at the end of `fetch()` from excessively
   * writing over a file we just read from.
   */
  set(
    key: string,
    val: Buffer,
    options?: LRUCache.SetOptions<string, Buffer, undefined> & {
      noDiskWrite?: boolean
    },
  ) {
    super.set(key, val, options)
    // set/delete also used internally by LRUCache to manage async fetches
    // only write when we're putting an actual value into the cache
    if (Buffer.isBuffer(val) && !options?.noDiskWrite) {
      // best effort, already have it in memory
      const path = this.path(key)
      const p: Promise<void> = this.#diskWrite(path, key, val)
        /* c8 ignore next */
        .catch(() => {})
        .then(() => this.#unpend(p, this.onDiskWrite, path, key, val))
      this.#pend(p)
    }
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

  /**
   * given a key, figure out the path on disk where it lives
   */
  path(key: string) {
    return resolve(this.#path, path(hash(key)))
  }

  /**
   * Read synchronously from the fs cache storage if not already
   * in memory.
   */
  fetchSync(
    key: string,
    opts?: LRUCache.FetchOptions<string, Buffer, undefined>,
  ) {
    const v = this.get(key)
    if (v) return v
    try {
      const v = readFileSync(this.path(key))
      // suppress the disk write, because we just read it from disk
      this.set(key, v, { ...opts, noDiskWrite: true })
      return v
      /* c8 ignore next */
    } catch {}
  }

  /**
   * This deletes the parent dir if the entry has no siblings,
   * and the grandparent dir if the parent has no siblings.
   */
  async #diskDelete(path: string): Promise<boolean> {
    const base = basename(path)
    const keyFile = path + '.key'
    const parent = dirname(path)
    const pBase = basename(parent)
    const gramps = dirname(parent)
    const sibs = (await readdir(parent)).filter(
      f => f !== base && f !== base + '.key',
    )
    let ret: boolean
    if (!sibs.length) {
      const uncles = (await readdir(gramps)).filter(f => f !== pBase)
      ret = await (!uncles.length ? rimraf(gramps) : rimraf(parent))
    } else {
      ret = await rimraf([path, keyFile])
    }
    return ret
  }

  async #diskWrite(path: string, key: string, val: Buffer) {
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })
    const base = basename(path)
    const keyFile = base + '.key'
    const tmp = dir + '/.' + base + '.' + this.#random
    const keyTmp = dir + '/.' + keyFile + '.' + this.#random
    await Promise.all([
      writeFile(tmp, val).then(() => rename(tmp, path)),
      writeFile(keyTmp, key).then(() =>
        rename(keyTmp, path + '.key'),
      ),
    ])
  }

  async #diskRead(k: string, v: Buffer | undefined) {
    return readFile(this.path(k)).catch(() => v)
  }
}
