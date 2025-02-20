import { error } from '@vltpkg/error-cause'
import type { Integrity } from '@vltpkg/types'
import { XDG } from '@vltpkg/xdg'
import { createHash, randomBytes } from 'crypto'
import { opendirSync, readFileSync } from 'fs'
import type { Dirent } from 'fs'
import {
  link,
  mkdir,
  opendir,
  readFile,
  rename,
  writeFile,
} from 'fs/promises'
import { LRUCache } from 'lru-cache'
import { resolve } from 'node:path'
import { basename, dirname } from 'path'
import { rimraf } from 'rimraf'

export type CacheFetchContext =
  | {
      integrity?: Integrity
    }
  | undefined

export type CacheOptions = {
  [k in keyof LRUCache.Options<
    string,
    Buffer,
    CacheFetchContext
  >]?: LRUCache.Options<string, Buffer, CacheFetchContext>[k]
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

export type BooleanOrVoid = boolean | void

const hash = (s: string) =>
  createHash('sha512').update(s).digest('hex')

export class Cache extends LRUCache<
  string,
  Buffer,
  CacheFetchContext
> {
  #path: string;
  [Symbol.toStringTag] = '@vltpkg/cache.Cache'
  #random: string = randomBytes(6).toString('hex')
  #i = 0
  #pending = new Set<Promise<BooleanOrVoid>>()
  onDiskWrite?: CacheOptions['onDiskWrite']
  onDiskDelete?: CacheOptions['onDiskDelete']

  /**
   * ensure we get a different random key for every write,
   * just in case the same file tries to write multiple times,
   * it'll still be atomic.
   */
  get random(): string {
    return this.#random + '.' + String(this.#i++)
  }

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
    return 10_000
  }

  constructor(options: CacheOptions) {
    const {
      onDiskWrite,
      onDiskDelete,
      path = new XDG('vlt').cache(),
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
        Object.assign(opts.options, {
          noDiskWrite: true,
        })
        return this.#diskRead(k, v, opts.context?.integrity)
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
    const dir = await opendir(this.#path, { bufferSize: 1024 })
    for await (const entry of dir) {
      const f = resolve(this.#path, entry.name)
      if (f.endsWith('.key')) {
        const entry: [string, Buffer] = await Promise.all([
          readFile(resolve(this.#path, f), 'utf8'),
          readFile(
            resolve(
              this.#path,
              f.substring(0, f.length - '.key'.length),
            ),
          ),
        ])
        yield entry
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
    const dir = opendirSync(this.#path, { bufferSize: 1024 })
    let entry: Dirent | null = null
    while (null !== (entry = dir.readSync())) {
      const f = resolve(this.#path, entry.name)
      if (f.endsWith('.key')) {
        const entry: [string, Buffer] = [
          readFileSync(resolve(this.#path, f), 'utf8'),
          readFileSync(
            resolve(
              this.#path,
              f.substring(0, f.length - '.key'.length),
            ),
          ),
        ]
        yield entry
      }
    }
    dir.closeSync()
  }
  [Symbol.iterator](): Generator<[string, Buffer], void> {
    return this.walkSync()
  }

  #unpend<F extends (...a: any[]) => any>(
    p: Promise<BooleanOrVoid>,
    fn: F | undefined,
    ...args: Parameters<F>
  ) {
    this.#pending.delete(p)
    if (fn) fn(...args)
  }

  #pend(p: Promise<BooleanOrVoid>) {
    this.#pending.add(p)
  }

  /**
   * Pass `true` as second argument to delete not just from the in-memory
   * cache, but the disk backing as well.
   */
  delete(key: string, fromDisk = false): boolean {
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
    options?: LRUCache.SetOptions<
      string,
      Buffer,
      CacheFetchContext
    > & {
      /** set to `true` to prevent writes to disk cache */
      noDiskWrite?: boolean
      /** sha512 integrity string */
      integrity?: Integrity
    },
  ) {
    super.set(key, val, options)
    const { noDiskWrite, integrity } = options ?? {}
    // set/delete also used internally by LRUCache to manage async fetches
    // only write when we're putting an actual value into the cache
    if (Buffer.isBuffer(val) && !noDiskWrite) {
      // best effort, already have it in memory
      const path = this.path(key)
      const p: Promise<void> = this.#diskWrite(
        path,
        key,
        val,
        integrity,
      )
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
  async promise(): Promise<void> {
    if (this.pending.length) await Promise.all(this.pending)
    /* c8 ignore next - race condition */
    if (this.#pending.size) await this.promise()
  }

  /**
   * given a key, figure out the path on disk where it lives
   */
  path(key: string) {
    return resolve(this.#path, hash(key))
  }
  /**
   * given an SRI sha512 integrity string, get the path on disk that
   * is hard-linked to the value.
   */
  integrityPath(integrity?: Integrity) {
    if (!integrity) return undefined
    const m = /^sha512-([a-zA-Z0-9/+]{86}==)$/.exec(integrity)
    const hash = m?.[1]
    if (!hash) {
      throw error('invalid integrity value', {
        found: integrity,
        wanted: /^sha512-([a-zA-Z0-9/+]{86}==)$/,
      })
    }
    const base = Buffer.from(hash, 'base64').toString('hex')
    return resolve(this.#path, base)
  }

  /**
   * Read synchronously from the fs cache storage if not already
   * in memory.
   */
  fetchSync(
    key: string,
    opts?: LRUCache.FetchOptions<string, Buffer, CacheFetchContext>,
  ) {
    const v = this.get(key)
    if (v) return v
    const intFile = this.#maybeIntegrityPath(opts?.context?.integrity)
    if (intFile) {
      try {
        const v = readFileSync(intFile)
        this.set(key, v, { ...opts, noDiskWrite: true })
        return v
        /* c8 ignore start */
      } catch {}
    }
    /* c8 ignore stop */
    try {
      const v = readFileSync(this.path(key))
      // suppress the disk write, because we just read it from disk
      this.set(key, v, { ...opts, noDiskWrite: true })
      return v
      /* c8 ignore start */
    } catch {}
  }
  /* c8 ignore stop */

  /**
   * Delete path and path + '.key'
   */
  async #diskDelete(path: string): Promise<boolean> {
    return rimraf([path, path + '.key'])
  }

  #maybeIntegrityPath(i?: Integrity) {
    try {
      return this.integrityPath(i)
    } catch {}
  }
  async #diskWrite(
    path: string,
    key: string,
    val: Buffer,
    integrity?: Integrity,
  ) {
    const dir = dirname(path)
    await mkdir(dir, { recursive: true })
    const intFile = this.#maybeIntegrityPath(integrity)
    const base = basename(path)
    const keyFile = base + '.key'
    const tmp = dir + '/.' + base + '.' + this.random
    const keyTmp = dir + '/.' + keyFile + '.' + this.random
    const writeData =
      intFile ?
        // try to just link into the temp location, rather than write
        // may fail with ENOENT or EEXIST, in which case, write normally
        link(intFile, tmp).catch(() => writeFile(tmp, val))
        // don't have it by integrity, write the new entry
      : writeFile(tmp, val)
    return Promise.all([
      writeData.then(() => rename(tmp, path)),
      writeFile(keyTmp, key).then(() =>
        rename(keyTmp, path + '.key'),
      ),
    ]).then(() => {
      if (intFile) {
        return link(path, intFile)
      }
    })
  }

  async #diskRead(
    k: string,
    v: Buffer | undefined,
    integrity?: Integrity,
  ) {
    const intFile = this.#maybeIntegrityPath(integrity)
    const file = this.path(k)
    const p =
      intFile ?
        readFile(intFile).catch(async () => {
          // if we get the value, but not integrity, link to the
          // integrity file so we get it next time.
          const value = await readFile(file)
          await link(file, intFile)
          return value
        })
      : readFile(file)
    return p.catch(() => v)
  }
}
