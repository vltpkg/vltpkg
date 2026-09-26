import { readFile } from 'node:fs/promises'
import { linkFromStore } from './link-tree.ts'
import type {
  LinkFromStoreOptions,
  StoreLinkResult,
} from './link-tree.ts'
import type { StoreIndex } from './store-index.ts'
import type { TarballFormat } from '@vltpkg/types'
import {
  unpack,
  unpackFileParallel,
  unpackFileSync,
  unpackParallel,
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
 * Decompression runs on libuv's threadpool, so packages inflate in
 * parallel; the files are then written synchronously on the main
 * thread, which is measurably faster than the async writers (the libuv
 * round trip per file costs more than the IO). `VLT_TAR_SYNC` switches
 * that pairing; see the constant above.
 *
 * There is no queue here. The only limiter is the caller's: reify caps
 * extraction at `Math.max(availableParallelism() - 1, 1) * 8` in flight
 * (`@vltpkg/graph`, `src/reify/index.ts`). A consumer that is not reify
 * is unbounded -- add your own cap. How many inflate at once is capped
 * lower and elsewhere, by `UV_THREADPOOL_SIZE` (4 by default).
 */
export class Pool {
  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Resolves when the tarball has been extracted.
   */
  async unpack(
    tarData: Buffer,
    target: string,
    format?: TarballFormat,
  ): Promise<void> {
    if (mode === '0') return unpack(tarData, target, format)
    if (mode === '1') return unpackSync(tarData, target, format)
    return unpackParallel(tarData, target, format)
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
    return linkFromStore(storeEntry, target, opts)
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
