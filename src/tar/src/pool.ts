import { readFile } from 'node:fs/promises'
import { linkFromStore } from './link-tree.ts'
import type {
  LinkFromStoreOptions,
  StoreLinkResult,
} from './link-tree.ts'
import { PlacementPool } from './placement-pool.ts'
import type { UnpackOptions } from './placement-pool.ts'
import type { StoreIndex } from './store-index.ts'
import type { TarballFormat } from '@vltpkg/types'
import {
  unpack,
  unpackFileParallel,
  unpackFileSync,
  unpackSync,
  unpackToStoreSync,
} from './unpack.ts'

/**
 * Which decompress/write pair {@link Pool} uses, from `VLT_TAR_SYNC`.
 * Both explicit values are field kill switches: either restores an
 * older behaviour without a release.
 *
 * - unset (default): inflate on libuv's threadpool, write on the main
 *   thread. Each half is the faster of its two options, and nothing
 *   ties them together.
 * - `1`: inflate and write on the main thread -- the pre-parallel
 *   default, for a host where the threadpool hop costs more than the
 *   overlap saves.
 * - `0`: the fully async writers, off the main thread throughout.
 */
const mode = process.env.VLT_TAR_SYNC

/**
 * Unpacks tarballs into place.
 *
 * Unpacking -- inflating, parsing and writing a tarball -- runs on a
 * {@link PlacementPool} of worker threads once an install is large
 * enough to pay for their boot (see `warm`), so several packages are
 * unpacked at once and the main thread stays free for the network and
 * the graph. Linking a global store entry stays on the main thread; see
 * `placement-worker.ts` for the measurement behind that. Until then, and on a
 * machine with no spare core, it runs as it did before the pool
 * existed: decompression on libuv's threadpool, the files written
 * synchronously on the main thread, which is measurably faster than the
 * async writers (the libuv round trip per file costs more than the IO).
 * `VLT_TAR_SYNC` switches that pairing and disables the pool; see the
 * constant above.
 *
 * The pool queues placements for its workers and caps the compressed
 * bytes held between download and unpack. The caller still caps how
 * many extractions it has in flight: reify does, in
 * `@vltpkg/graph` `src/reify/index.ts`.
 */
export class Pool {
  #placement?: PlacementPool

  get #pool(): PlacementPool {
    this.#placement ??= new PlacementPool()
    return this.#placement
  }

  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Resolves when the tarball has been extracted. The buffer
   * must not be used afterwards: see {@link PlacementPool.unpack}.
   */
  async unpack(
    tarData: Buffer,
    target: string,
    format?: TarballFormat,
    options?: UnpackOptions,
  ): Promise<void> {
    if (mode === '0') return unpack(tarData, target, format)
    if (mode === '1') return unpackSync(tarData, target, format)
    return this.#pool.unpack(tarData, target, format, options)
  }

  /**
   * Same, reading the tarball from a file and skipping `offset` leading
   * bytes, so a cache entry is unpacked without loading it into the
   * registry client's in-memory cache.
   */
  async unpackFile(
    file: string,
    target: string,
    offset = 0,
    format?: TarballFormat,
  ): Promise<void> {
    if (mode === '0') {
      return unpack(
        (await readFile(file)).subarray(offset),
        target,
        format,
      )
    }
    if (mode === '1') {
      return unpackFileSync(file, target, offset, format)
    }
    return unpackFileParallel(file, target, offset, format)
  }

  /**
   * Hardlink (or copy) a global store entry into `target`. Resolves
   * how, with the index, or false on a store miss. See
   * {@link linkFromStore}.
   */
  async linkFromStore(
    storeEntry: string,
    target: string,
    opts?: LinkFromStoreOptions,
  ): Promise<StoreLinkResult> {
    // links stay on the main thread: see `placement-worker.ts`
    return linkFromStore(storeEntry, target, opts)
  }

  /**
   * Start the unpack workers for an install about to unpack `jobs`
   * tarballs, so they boot while the first packages are fetched rather
   * than on the first placement. Never rejects. See
   * {@link PlacementPool.warm}.
   */
  async warm(jobs: number): Promise<void> {
    if (mode !== undefined) return
    await this.#pool.warm(jobs)
  }

  /**
   * Terminate the placement worker threads, if any were started. The
   * pool works without this -- idle workers do not keep the process
   * alive -- but reify calls it when an install's placement is done, to
   * free the threads promptly.
   */
  async close(): Promise<void> {
    await this.#placement?.close()
  }

  /**
   * Explode a tarball into `dir` for the global store. See
   * {@link unpackToStoreSync}.
   */
  async unpackToStore(
    tarData: Buffer,
    dir: string,
    format?: TarballFormat,
  ): Promise<{ index: StoreIndex }> {
    return unpackToStoreSync(tarData, dir, format)
  }
}
