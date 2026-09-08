import { readFile } from 'node:fs/promises'
import { unpack, unpackFileSync, unpackSync } from './unpack.ts'

// Field kill switch: restores the async writer without a release.
const syncUnpack = process.env.VLT_TAR_SYNC !== '0'

/**
 * Unpacks tarballs into place.
 *
 * Unpacking runs synchronously on the main thread, which is measurably
 * faster than the async writers (the libuv round trip per file costs
 * more than the IO). No queue: reify already caps extraction at
 * `8 * (cpus - 1)` in flight.
 */
export class Pool {
  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Resolves when the tarball has been extracted.
   */
  async unpack(tarData: Buffer, target: string): Promise<void> {
    if (!syncUnpack) return unpack(tarData, target)
    unpackSync(tarData, target)
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
  ): Promise<void> {
    if (!syncUnpack) {
      return unpack((await readFile(file)).subarray(offset), target)
    }
    unpackFileSync(file, target, offset)
  }
}
