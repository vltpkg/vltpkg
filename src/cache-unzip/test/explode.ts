import { Cache } from '@vltpkg/cache'
import { unpackSync, unpackToStoreSync } from '@vltpkg/tar/unpack'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import type { Test } from 'tap'
import t from 'tap'
import { explode } from '../src/explode.ts'
import {
  encodeEntry,
  hexOf,
  integrityOf,
  makeTar,
  pkgTar,
} from './fixtures/entry.ts'

const isWin = process.platform === 'win32'
process.umask(0o022)
process.env.VLT_STORE_LINKER = 'hardlink'
delete process.env.VLT_CACHE_EXPLODE_CONCURRENCY

const tgz = gzipSync(pkgTar())
const tar = pkgTar(' raw')
const tgzHex = hexOf(tgz)
const tarHex = hexOf(tar)
const entry = (body: Buffer, integrity: string = integrityOf(body)) =>
  encodeEntry(
    { 'content-type': 'application/octet-stream', integrity },
    body,
  )

const setup = async (t: Test, entries: Record<string, Buffer>) => {
  const dir = t.testdir()
  const path = resolve(dir, 'registry-client')
  const store = resolve(dir, 'store/v1')
  const c = new Cache({ path })
  for (const [k, v] of Object.entries(entries)) c.set(k, v)
  await c.promise()
  return { dir, store, cache: new Cache({ path }) }
}

// path, mode and contents of every file and dir under `dir`
const tree = (dir: string) =>
  readdirSync(dir, { recursive: true })
    .map(String)
    .sort()
    .map(f => {
      const p = join(dir, f)
      const st = lstatSync(p)
      return [
        f.replace(/\\/g, '/'),
        isWin ? 0 : st.mode & 0o777,
        st.isFile() ? readFileSync(p, 'utf8') : '/',
      ] as const
    })

t.test('explodes gzipped and raw tarballs', async t => {
  const { dir, store, cache } = await setup(t, {
    gz: entry(tgz),
    raw: entry(tar),
  })
  const s = await explode(cache, store, ['gz', 'raw'])
  t.match(s, { written: 2, skipped: 0, failed: 0, ms: Number })
  t.strictSame(s?.exploded, new Set(['gz', 'raw']))
  t.strictSame(readdirSync(join(store, '.tmp')), [], 'tmp emptied')
  t.strictSame(
    readdirSync(store).sort(),
    [
      '.tmp',
      tarHex,
      `${tarHex}.json`,
      tgzHex,
      `${tgzHex}.json`,
    ].sort(),
  )

  for (const [hex, body] of [
    [tgzHex, tgz],
    [tarHex, tar],
  ] as const) {
    const e = join(store, hex)
    const unpacked = join(dir, 'unpacked', hex)
    unpackSync(body, unpacked)
    // same bytes and modes as unpack, plus the exec bit on bins
    t.strictSame(
      tree(e),
      tree(unpacked).map(([f, mode, body]) => [
        f,
        f === 'bin/x.js' && !isWin ? 0o755 : mode,
        body,
      ]),
    )
    if (!isWin) {
      t.equal(lstatSync(join(e, 'bin/x.js')).mode & 0o777, 0o755)
      t.equal(lstatSync(join(e, 'tool.sh')).mode & 0o777, 0o755)
      t.equal(lstatSync(join(e, 'README.md')).mode & 0o777, 0o644)
    }
    const index = JSON.parse(
      readFileSync(`${e}.json`, 'utf8'),
    ) as unknown
    t.strictSame(
      index,
      unpackToStoreSync(body, join(dir, 'x', hex)).index,
    )
    t.match(index, {
      v: 1,
      scripts: false,
      bins: { x: 'bin/x.js' },
      name: 'x',
      version: '1.0.0',
    })
  }
  t.equal(
    s?.bytes,
    [tgzHex, tarHex]
      .flatMap(h => tree(join(store, h)))
      .reduce((n, [, , b]) => n + (b === '/' ? 0 : b.length), 0),
  )

  const pj = lstatSync(join(store, tgzHex, 'package.json'))
  const side = lstatSync(join(store, `${tgzHex}.json`))
  t.match(
    await explode(cache, store, ['gz', 'raw']),
    { exploded: new Set(), written: 0, skipped: 2, failed: 0 },
    'idempotent',
  )
  t.equal(
    lstatSync(join(store, tgzHex, 'package.json')).ino,
    pj.ino,
    'entry untouched',
  )
  t.equal(
    lstatSync(join(store, `${tgzHex}.json`)).ino,
    side.ino,
    'sidecar untouched',
  )
})

t.test('explodes a brotli tarball, keyed by its url', async t => {
  // brotli bytes carry no signature, so the key -- which is the url the
  // entry was fetched from -- is the only thing that says `.tar.br`.
  const br = brotliCompressSync(pkgTar(' brotli'))
  const brHex = hexOf(br)
  const key = 'https://reg.io/x/-/x-1.0.0.tar.br'
  const { dir, store, cache } = await setup(t, { [key]: entry(br) })
  t.match(await explode(cache, store, [key]), {
    written: 1,
    failed: 0,
  })
  t.strictSame(
    JSON.parse(readFileSync(join(store, `${brHex}.json`), 'utf8')),
    unpackToStoreSync(br, join(dir, 'x'), 'brotli').index,
  )
  t.strictSame(
    tree(join(store, brHex)).map(([f]) => f),
    tree(join(dir, 'x')).map(([f]) => f),
  )
})

t.test('a brotli entry at a .tgz key cannot explode', async t => {
  // defense in depth for a registry that renamed an artifact: without
  // the extension nothing declares brotli, so the body reads as a raw
  // tar and is rejected rather than written as garbage.
  const br = brotliCompressSync(pkgTar(' brotli'))
  const key = 'https://reg.io/x/-/x-1.0.0.tgz'
  const { store, cache } = await setup(t, { [key]: entry(br) })
  t.match(await explode(cache, store, [key]), {
    written: 0,
    failed: 1,
  })
})

t.test('redoes an entry without a valid sidecar', async t => {
  const { store, cache } = await setup(t, {
    gz: entry(tgz),
    raw: entry(tar),
  })
  // partial dir, no sidecar; dir with a garbage sidecar
  mkdirSync(join(store, tgzHex, 'lib'), { recursive: true })
  mkdirSync(join(store, tarHex), { recursive: true })
  writeFileSync(join(store, `${tarHex}.json`), '{')
  t.match(await explode(cache, store, ['gz', 'raw']), {
    written: 2,
    skipped: 0,
  })
  for (const hex of [tgzHex, tarHex]) {
    t.ok(existsSync(join(store, hex, 'package.json')), hex)
    t.match(
      JSON.parse(readFileSync(join(store, `${hex}.json`), 'utf8')),
      { v: 1, name: 'x' },
    )
  }
})

t.test('another writer wins the rename', async t => {
  const { store, cache } = await setup(t, { gz: entry(tgz) })
  const { explode } = await t.mockImport<
    typeof import('../src/explode.ts')
  >('../src/explode.ts', {
    '@vltpkg/tar/unpack': {
      unpackToStoreSync: (data: Buffer, dir: string) => {
        const res = unpackToStoreSync(data, dir)
        mkdirSync(join(store, tgzHex, 'winner'), { recursive: true })
        return res
      },
    },
  })
  t.match(await explode(cache, store, ['gz']), {
    written: 0,
    skipped: 1,
    failed: 0,
  })
  t.strictSame(readdirSync(join(store, tgzHex)), ['winner'])
  t.strictSame(readdirSync(join(store, '.tmp')), [], 'tmp discarded')
})

t.test('failed publish cleans up tmp', async t => {
  const { store, cache } = await setup(t, { gz: entry(tgz) })
  const { explode } = await t.mockImport<
    typeof import('../src/explode.ts')
  >('../src/explode.ts', {
    '@vltpkg/tar/unpack': {
      unpackToStoreSync: (data: Buffer, dir: string) => {
        const res = unpackToStoreSync(data, dir)
        rmSync(dir, { recursive: true })
        return res
      },
    },
  })
  t.match(await explode(cache, store, ['gz']), {
    written: 0,
    skipped: 0,
    failed: 1,
  })
  t.equal(existsSync(join(store, tgzHex)), false)
  t.ok(
    existsSync(join(store, `${tgzHex}.json`)),
    'sidecar published before the dir',
  )
  t.strictSame(readdirSync(join(store, '.tmp')), [])
})

t.test('bad entries are skipped, the rest still written', async t => {
  // valid tarball, but inflates past the decompression bound
  const bomb = gzipSync(
    Buffer.concat([pkgTar(), Buffer.alloc(32 * 1024 * 1024)]),
  )
  const noPkg = makeTar([[{ path: 'package/index.js' }, 'x']])
  const garbage = Buffer.from('not a tarball')
  const { store, cache } = await setup(t, {
    bomb: entry(bomb),
    noPkg: entry(noPkg),
    garbage: entry(garbage),
    short: Buffer.from('ab'),
    noIntegrity: encodeEntry({ 'x-other': 'y' }, tgz),
    sha1: entry(tgz, 'sha1-2jmj7l5rSw0yVb/vlWAYkK/YBwk='),
    gz: entry(tgz),
  })
  t.match(
    await explode(cache, store, [
      'bomb',
      'noPkg',
      'garbage',
      'short',
      'noIntegrity',
      'sha1',
      'missing',
      'gz',
    ]),
    {
      exploded: new Set(['gz']),
      written: 1,
      skipped: 0,
      ignored: 3,
      failed: 4,
    },
  )
  t.strictSame(
    readdirSync(store).sort(),
    ['.tmp', tgzHex, `${tgzHex}.json`].sort(),
  )
  t.strictSame(readdirSync(join(store, '.tmp')), [])

  // the bound is what stopped it
  t.throws(() => unpackToStoreSync(bomb, join(store, 'b')), {
    message: 'tarball exceeds maximum unpacked size',
  })
})

t.test('reads entries cached only under their integrity', async t => {
  const dir = t.testdir()
  const path = resolve(dir, 'registry-client')
  const store = resolve(dir, 'store/v1')
  const integrity = integrityOf(tgz)
  const c = new Cache({ path })
  c.set('gz', entry(tgz), { integrity })
  await c.promise()
  rmSync(c.path('gz'))
  rmSync(c.path('gz') + '.key')
  t.match(await explode(new Cache({ path }), store, ['gz']), {
    written: 0,
    ignored: 1,
  })
  t.match(
    await explode(
      new Cache({ path }),
      store,
      ['gz'],
      new Map([['gz', integrity]]),
    ),
    { written: 1, ignored: 0 },
  )
  t.ok(existsSync(join(store, tgzHex)))
})

t.test('gated on VLT_STORE_LINKER', async t => {
  t.teardown(() => {
    process.env.VLT_STORE_LINKER = 'hardlink'
  })
  const { dir, store, cache } = await setup(t, { gz: entry(tgz) })
  for (const linker of [undefined, 'unpack', 'bogus']) {
    if (linker) process.env.VLT_STORE_LINKER = linker
    else delete process.env.VLT_STORE_LINKER
    t.equal(
      await explode(cache, store, ['gz']),
      undefined,
      String(linker),
    )
    t.strictSame(readdirSync(dir), ['registry-client'], 'no store')
  }
  for (const linker of ['auto', 'copy']) {
    process.env.VLT_STORE_LINKER = linker
    rmSync(store, { recursive: true, force: true })
    t.match(
      await explode(cache, store, ['gz']),
      { written: 1 },
      linker,
    )
  }
})

t.test('sweeps stale tmp entries', async t => {
  const { store, cache } = await setup(t, { gz: entry(tgz) })
  const tmp = join(store, '.tmp')
  mkdirSync(join(tmp, 'old.1.0'), { recursive: true })
  writeFileSync(join(tmp, 'old.1.0', 'f'), 'x')
  writeFileSync(join(tmp, 'old.json.1.0'), 'x')
  mkdirSync(join(tmp, 'fresh.1.0'))
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000)
  utimesSync(join(tmp, 'old.1.0'), old, old)
  utimesSync(join(tmp, 'old.json.1.0'), old, old)
  t.match(await explode(cache, store, ['gz']), { written: 1 })
  t.strictSame(readdirSync(tmp), ['fresh.1.0'])
})

t.test('VLT_CACHE_EXPLODE_CONCURRENCY', async t => {
  t.teardown(() => {
    delete process.env.VLT_CACHE_EXPLODE_CONCURRENCY
  })
  const bodies = [0, 1, 2].map(i => gzipSync(pkgTar(String(i))))
  const entries = Object.fromEntries(
    bodies.map((b, i) => [`k${i}`, entry(b)]),
  )
  for (const conc of ['4', 'nope']) {
    process.env.VLT_CACHE_EXPLODE_CONCURRENCY = conc
    const { store, cache } = await setup(t, entries)
    t.match(
      await explode(cache, store, Object.keys(entries)),
      { written: 3, skipped: 0, failed: 0 },
      conc,
    )
    for (const b of bodies) {
      t.ok(existsSync(join(store, `${hexOf(b)}.json`)))
    }
  }
})
