// 3a dark test: the real RegistryClient, compiled, against the fixture above.
// Imported by relative path — this directory is not a workspace, and the
// point is to exercise the shipped module.
import {
  RegistryClient,
  cacheKey,
} from '../../../../src/registry-client/src/index.ts'

const base = process.argv[2]!
const cache = process.argv[3]!
const out: Record<string, unknown> = {}
// The transport checks run with `useCache: false` so they exercise the
// wire, not the disk. The `cached*` checks at the end run with the cache
// on — that path works compiled since the F43/F47 fix (vendored
// lru-cache).
const rc = new RegistryClient({ cache, 'fetch-retries': 3 })
const noCache = { useCache: false } as const

const safe = async (k: string, f: () => unknown) => {
  process.stderr.write(`  ${k}\n`)
  try {
    out[k] = await f()
  } catch (er) {
    out[k] = `throw:${(er as Error).name}`
  }
}

out.backend = (await rc.transport()).constructor.name
out.compiled = 'perry' in process.versions

await safe('packument', async () => {
  const e = await rc.request(`${base}/abbrev`, noCache)
  return {
    status: e.statusCode,
    name: (e.json() as { name: string }).name,
    gzip: e.isGzip,
  }
})
await safe('conditional', async () => {
  const a = await rc.request(`${base}/conditional`, noCache)
  const b = await rc.request(`${base}/conditional`, noCache)
  return { first: a.statusCode, second: b.statusCode }
})
await safe('retryDroppedConnection', async () => {
  await rc.request(`${base}/reset`, noCache)
  const e = await rc.request(`${base}/flaky`, noCache)
  return { status: e.statusCode, body: e.text() }
})
await safe('retryThrottle', async () => {
  await rc.request(`${base}/reset`, noCache)
  const e = await rc.request(`${base}/throttle`, noCache)
  return { status: e.statusCode }
})
await safe('redirect', async () => {
  const e = await rc.request(`${base}/redirect`, noCache)
  return {
    status: e.statusCode,
    name: (e.json() as { name: string }).name,
  }
})
await safe('authHeader', async () => {
  const e = await rc.request(`${base}/auth`, {
    ...noCache,
    headers: { authorization: 'Bearer SECRET' },
  })
  return e.json()
})
await safe('404', async () => {
  const e = await rc.request(`${base}/missing`, noCache)
  return { status: e.statusCode }
})
// the cached path: response reaches disk through @vltpkg/cache, and a
// second request is served from / revalidated against it
await safe('cachedWrite', async () => {
  const url = `${base}/abbrev`
  const first = await rc.request(url)
  await rc.cache.promise()
  const onDisk = rc.cache.fetchSync(cacheKey('GET', url))
  const again = await rc.request(url)
  return {
    status: first.statusCode,
    onDisk: !!onDisk,
    againStatus: again.statusCode,
    sameName:
      (again.json() as { name: string }).name ===
      (first.json() as { name: string }).name,
  }
})
console.log(JSON.stringify(out))
