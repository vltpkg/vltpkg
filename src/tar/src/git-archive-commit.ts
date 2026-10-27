import { constants, gunzipSync } from 'node:zlib'
import { Header } from 'tar/header'
import { Pax } from 'tar/pax'

// compressed bytes to inflate: git archive needs ~200 for its first 1024
const gzipHead = 4096

const sha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

/**
 * The commit a `git archive` tarball was made from: the `comment` of
 * its leading pax global header. Takes a gzipped or raw tarball and
 * inflates only its head. `undefined` when there is none (eg an npm
 * tarball) or the data is not a tarball.
 */
export const gitArchiveCommit = (
  tarData: Buffer,
): string | undefined => {
  try {
    const buf =
      tarData[0] === 0x1f && tarData[1] === 0x8b ?
        gunzipSync(tarData.subarray(0, gzipHead), {
          finishFlush: constants.Z_SYNC_FLUSH,
        })
      : tarData
    const { cksumValid, type, size } = new Header(buf)
    if (!cksumValid || type !== 'GlobalExtendedHeader' || !size) {
      return
    }
    const { comment } = Pax.parse(
      buf.subarray(512, 512 + size).toString(),
      undefined,
      true,
    )
    return comment && sha.test(comment) ? comment : undefined
  } catch {
    return undefined
  }
}
