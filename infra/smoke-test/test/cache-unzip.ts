import { CacheEntry } from '@vltpkg/registry-client/cache-entry'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type { Test } from 'tap'
import { runMultiple } from './fixtures/run.ts'

const readCache = (cache: string) => {
  const dir = join(cache, 'vlt/registry-client')
  const names = readdirSync(dir)
  const entries = names
    .filter(n => !n.endsWith('.key') && !n.startsWith('.'))
    .map(n => {
      const buf = readFileSync(join(dir, n))
      return {
        json: CacheEntry.decode(buf).isJSON,
        gzip: CacheEntry.isGzipEntry(buf),
      }
    })
  let store = false
  try {
    store = readdirSync(join(cache, 'vlt/store/v1')).some(n =>
      /^[0-9a-f]{128}$/.test(n),
    )
  } catch {}
  return {
    tmp: names.filter(n => n.startsWith('.')),
    keys: names.filter(n => n.endsWith('.key')),
    json: entries.filter(e => e.json),
    tarballs: entries.filter(e => !e.json),
    store,
  }
}

// the child is unref'd and outlives vlt: poll, up to 10s
const settle = async (
  cache: string,
  done: (c: ReturnType<typeof readCache>) => boolean,
) => {
  let c = readCache(cache)
  for (let i = 0; i < 100 && !done(c); i++) {
    await setTimeout(100)
    c = readCache(cache)
  }
  return c
}

// the store is filled and tarballs stay gzipped
const storeTest = async (t: Test, dirs: { cache: string }) => {
  const c = await settle(
    dirs.cache,
    c => c.store && !c.tmp.length && !c.json.some(e => e.gzip),
  )
  t.strictSame(c.tmp, [], 'no tmp files remain')
  t.ok(c.keys.length, 'cache keys exist')
  t.ok(c.json.length, 'json entries exist')
  t.ok(
    c.json.every(e => !e.gzip),
    'json entries are ungzipped',
  )
  t.ok(c.tarballs.length, 'tarball entries exist')
  t.ok(
    c.tarballs.every(e => e.gzip),
    'tarball entries are gzipped',
  )
  t.ok(c.store, 'global store populated')
}

// no store, every cache entry un-gzipped
const unpackTest = async (t: Test, dirs: { cache: string }) => {
  const c = await settle(
    dirs.cache,
    c =>
      !c.tmp.length &&
      !!c.tarballs.length &&
      ![...c.json, ...c.tarballs].some(e => e.gzip),
  )
  t.strictSame(c.tmp, [], 'no tmp files remain')
  t.ok(c.keys.length, 'cache keys exist')
  t.ok(c.tarballs.length, 'tarball entries exist')
  t.ok(
    [...c.json, ...c.tarballs].every(e => !e.gzip),
    'all cache entries are ungzipped',
  )
  t.notOk(c.store, 'global store not populated')
}

// `auto` hardlinks from the global store on linux only, and means
// `unpack` everywhere else
t.test('default: store on linux, unpack elsewhere', async t => {
  const { status } = await runMultiple(t, ['i', 'abbrev'], {
    test: async ({ t, dirs }) =>
      process.platform === 'linux' ?
        storeTest(t, dirs)
      : unpackTest(t, dirs),
  })
  t.equal(status, 0)
})

t.test(
  'store-linker=hardlink: explodes tarballs, leaves them gzipped',
  async t => {
    const { status } = await runMultiple(t, ['i', 'abbrev'], {
      env: { VLT_STORE_LINKER: 'hardlink' },
      test: async ({ t, dirs }) => storeTest(t, dirs),
    })
    t.equal(status, 0)
  },
)

t.test('store-linker=unpack: unzips all cache entries', async t => {
  const { status } = await runMultiple(t, ['i', 'abbrev'], {
    env: { VLT_STORE_LINKER: 'unpack' },
    test: async ({ t, dirs }) => unpackTest(t, dirs),
  })
  t.equal(status, 0)
})
