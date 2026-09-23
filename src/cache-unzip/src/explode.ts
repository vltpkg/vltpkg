import type { Cache } from '@vltpkg/cache'
import { storeIndexPath } from '@vltpkg/tar/store-index'
import { unpackToStoreSync } from '@vltpkg/tar/unpack'
import { integrityHex } from '@vltpkg/types'
import {
  lstatSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { debuglog } from 'node:util'

const debug = debuglog('vlt')

/** `store-linker` values that read from the global store. */
const linkers = new Set(['auto', 'hardlink', 'copy'])

// a killed child leaves its tmp behind, and nothing else removes it
const STALE_MS = 60 * 60 * 1000

export type ExplodeSummary = {
  written: number
  skipped: number
  failed: number
  bytes: number
  ms: number
}

const parseConcurrency = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

const rm = (path: string) =>
  rmSync(path, { recursive: true, force: true })

// the integrity header of an encoded cache entry
const entryIntegrity = (buf: Buffer): string | undefined => {
  const headSize = buf.readUInt32BE(0)
  let key: string | undefined
  for (let i = 7, size = 4; i + 4 <= headSize; i += size) {
    size = Math.max(4, buf.readUInt32BE(i))
    const h = buf.toString('utf8', i + 4, i + size)
    if (key === undefined) key = h.toLowerCase()
    else if (key === 'integrity') return h
    else key = undefined
  }
}

const sweep = (tmp: string) => {
  let names: string[]
  try {
    names = readdirSync(tmp)
  } catch {
    return
  }
  const now = Date.now()
  for (const name of names) {
    const p = join(tmp, name)
    try {
      if (now - lstatSync(p).mtimeMs > STALE_MS) rm(p)
      /* c8 ignore next */
    } catch {}
  }
}

let seq = 0

/**
 * Explode one cache entry into `store`. Returns the bytes written, or
 * undefined if skipped (no sha512 integrity, or already present).
 * Throws on a bad tarball.
 */
const explodeEntry = (
  store: string,
  buf: Buffer,
): number | undefined => {
  const hex = integrityHex(entryIntegrity(buf))
  if (!hex) return undefined
  const entry = join(store, hex)
  if (lstatSync(entry, { throwIfNoEntry: false })) return undefined
  const n = `${process.pid}.${seq++}`
  const tmp = join(store, '.tmp', `${hex}.${n}`)
  const sideTmp = join(store, '.tmp', `${hex}.json.${n}`)
  const { index } = unpackToStoreSync(
    buf.subarray(buf.readUInt32BE(0)),
    tmp,
  )
  try {
    // sidecar first: an entry dir without one is a store miss
    writeFileSync(sideTmp, JSON.stringify(index))
    renameSync(sideTmp, storeIndexPath(entry))
    renameSync(tmp, entry)
  } catch (er) {
    rm(tmp)
    rm(sideTmp)
    // another writer won the rename
    if (lstatSync(entry, { throwIfNoEntry: false })) return undefined
    throw er
  }
  let bytes = 0
  for (const [, size] of index.files) bytes += size
  return bytes
}

/**
 * Explode the tarball cache entries at `keys` into the global store
 * root `store`, one `<integrity-hex>` dir plus sidecar index each.
 * No-op unless `VLT_STORE_LINKER` is a linker that reads the store.
 */
export const explode = async (
  cache: Cache,
  store: string,
  keys: string[],
): Promise<ExplodeSummary | undefined> => {
  if (!linkers.has(process.env.VLT_STORE_LINKER ?? '')) return
  const start = performance.now()
  const s: ExplodeSummary = {
    written: 0,
    skipped: 0,
    failed: 0,
    bytes: 0,
    ms: 0,
  }
  sweep(join(store, '.tmp'))
  let next = 0
  const lane = async () => {
    for (;;) {
      const key = keys[next++]
      if (key === undefined) return
      const buf = await cache.fetch(key)
      // done with it; a pending disk write keeps its own reference
      cache.delete(key)
      if (!buf) {
        s.skipped++
        continue
      }
      try {
        const bytes = explodeEntry(store, buf)
        if (bytes === undefined) s.skipped++
        else {
          s.written++
          s.bytes += bytes
        }
      } catch (er) {
        s.failed++
        debug('global store: explode failed', key, er)
      }
    }
  }
  const lanes = Math.min(
    parseConcurrency(process.env.VLT_CACHE_EXPLODE_CONCURRENCY),
    keys.length,
  )
  await Promise.all(Array.from({ length: lanes }, lane))
  s.ms = Math.round(performance.now() - start)
  debug(
    'global store: explode written=%d skipped=%d failed=%d bytes=%d ms=%d',
    s.written,
    s.skipped,
    s.failed,
    s.bytes,
    s.ms,
  )
  return s
}
