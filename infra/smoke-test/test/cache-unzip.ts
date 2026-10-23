import { CacheEntry } from '@vltpkg/registry-client/cache-entry'
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type { Test } from 'tap'
import { runMultiple } from './fixtures/run.ts'

// entries and their integrity links are 128 hex chars, keys add
// `.key`. anything else is a write in flight: Cache writes
// `<name>.<random>.<n>` then renames it, so it can vanish before
// we read it.
const entryName = /^[0-9a-f]{128}$/
const keyName = /^[0-9a-f]{128}\.key$/

const readCache = (cache: string) => {
  const dir = join(cache, 'vlt/registry-client')
  const names = readdirSync(dir)
  const entries = names
    .filter(n => entryName.test(n))
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
    tmp: names.filter(n => !entryName.test(n) && !keyName.test(n)),
    keys: names.filter(n => keyName.test(n)),
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

// `auto` hardlinks from the global store on linux, clones from it on
// darwin when node has `node:ffi`, and means `unpack` everywhere else
const cloneable =
  process.platform === 'darwin' && isBuiltin('node:ffi')

t.test(
  'default: store on linux and darwin, unpack elsewhere',
  async t => {
    const store = process.platform === 'linux' || cloneable
    const { status } = await runMultiple(t, ['i', 'abbrev'], {
      test: async ({ t, dirs }) =>
        store ? storeTest(t, dirs) : unpackTest(t, dirs),
    })
    t.equal(status, 0)
  },
)

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

t.test(
  'store-linker=clone: the next install clones from the store',
  { skip: !cloneable && 'needs macOS and node:ffi' },
  async t => {
    const env = { VLT_STORE_LINKER: 'clone' }
    const { status } = await runMultiple(t, ['i', 'abbrev'], {
      env,
      test: async ({ t, dirs, run }) => {
        await storeTest(t, dirs)
        rmSync(join(dirs.project, 'node_modules'), {
          recursive: true,
        })
        const again = await run(['i', 'abbrev'], {
          env: { ...env, NODE_DEBUG: 'vlt' },
        })
        t.equal(again.status, 0)
        t.match(
          again.stderr,
          /global store: linked=0 cloned=1 copied=0 missed=0/,
        )
        const pj = join(
          dirs.project,
          'node_modules/abbrev/package.json',
        )
        t.equal(statSync(pj).nlink, 1, 'a clone, not a hardlink')
        t.ok(
          readdirSync(join(dirs.cache, 'vlt/store/v1')).some(n =>
            n.endsWith('.copied'),
          ),
          'entry marked used',
        )
      },
    })
    t.equal(status, 0)
  },
)
