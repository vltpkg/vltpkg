// Node-side setup for the daemons dark test. Builds the fixtures each
// worker operates on; run.sh then drives the worker (compiled or Node)
// and verify.ts asserts on the result.
import { Cache } from '../../../../src/cache/src/index.ts'
import { RegistryClient } from '../../../../src/registry-client/src/index.ts'
import { gzipSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [work, base] = [process.argv[2]!, process.argv[3]!]

// cache-unzip: a gzip-bodied entry, same shape as the package's own tests
const head10 = new Uint8Array(10)
new DataView(head10.buffer).setUint32(0, 10)
const unzipCache = new Cache({ path: resolve(work, 'unzip-cache') })
unzipCache.set(
  'gz1',
  Buffer.concat([head10, gzipSync(Buffer.from('yes gzipped'))]),
)
await unzipCache.promise()

// cache-revalidate: a real cached response from the fixture registry.
// /conditional, not /abbrev — a gzip body would arm the cache-unzip
// beforeExit hook in this setup process and race the test.
const rc = new RegistryClient({ cache: resolve(work, 'reval') })
const res = await rc.request(`${base}/conditional`)
if (res.statusCode !== 200) {
  throw new Error(`setup: fixture request failed ${res.statusCode}`)
}
await rc.cache.promise()

// rollback-remove: two directories with content
for (const d of ['rm/a/deep', 'rm/b']) {
  mkdirSync(resolve(work, d), { recursive: true })
  writeFileSync(resolve(work, d, 'f.txt'), 'x')
}

process.stdout.write('setup ok\n')
