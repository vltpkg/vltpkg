// Node-side assertions for the daemons dark test. Prints a JSON record
// run.sh diffs between the compiled run and the Node run.
import { Cache } from '../../../../src/cache/src/index.ts'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [work, base] = process.argv.slice(2)
if (!work || !base) {
  throw new Error('usage: verify <workdir> <fixture-base-url>')
}
const out: Record<string, unknown> = {}

// cache-unzip: gz1's body must now be the inflated bytes
const unzipCache = new Cache({ path: resolve(work, 'unzip-cache') })
const gz1 = unzipCache.fetchSync('gz1')
if (gz1) {
  const headLen = new DataView(
    gz1.buffer,
    gz1.byteOffset,
    gz1.byteLength,
  ).getUint32(0)
  out.unzipBody = gz1.subarray(headLen).toString()
} else {
  out.unzipBody = 'missing'
}

// cache-revalidate: the worker hit the origin, and the entry survived
const hits = JSON.parse(
  readFileSync(resolve(work, 'hits.json'), 'utf8'),
) as Record<string, number>
// 1 from setup + 1 from the worker's revalidation
out.revalidateHitOrigin = (hits['/conditional'] ?? 0) >= 2
const revalEntry = new Cache({
  path: resolve(work, 'reval', 'registry-client'),
}).fetchSync(`${base}/conditional`)
out.revalidateEntryIntact = !!revalEntry && revalEntry.length > 0

// rollback-remove: both trees gone
out.removed =
  !existsSync(resolve(work, 'rm/a')) &&
  !existsSync(resolve(work, 'rm/b'))

// security-archive-update: exit codes recorded by run.sh
out.exitCodes = JSON.parse(
  readFileSync(resolve(work, 'exits.json'), 'utf8'),
)

process.stdout.write(JSON.stringify(out) + '\n')
