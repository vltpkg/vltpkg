import { Cache } from '@vltpkg/cache'
import { spawnSync } from 'node:child_process'
import { EventEmitter } from 'node:events'
import * as os from 'node:os'
import t from 'tap'
import type { Test } from 'tap'
import { gzipSync } from 'node:zlib'
import { __CODE_SPLIT_SCRIPT_NAME } from '../src/unzip.ts'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Integrity } from '@vltpkg/types'
import {
  encodeEntry,
  hexOf,
  integrityOf,
  pkgTar,
} from './fixtures/entry.ts'

const ENV = {
  NODE_OPTIONS: '--no-warnings --experimental-strip-types',
}

t.test('validate args', async t => {
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME], {
      input: '',
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf8',
      env: ENV,
    }),
    {
      status: 1,
    },
  )
  t.match(
    spawnSync(process.execPath, [__CODE_SPLIT_SCRIPT_NAME, 'path'], {
      input: '',
      env: ENV,
    }),
    {
      status: 0,
    },
    'nothing to do',
  )
  t.match(
    spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, t.testdir()],
      {
        input: 'nope\0not valid\0no valid keys\0',
        env: ENV,
      },
    ),
    { status: 0 },
    'missing keys',
  )
})

t.test('unzip some stuff in the cache', async t => {
  const cache = new Cache({ path: t.testdir() })

  const head10 = Buffer.alloc(10)
  head10.writeUint32BE(10, 0)

  const plain = Buffer.concat([head10, Buffer.from('not gzipped')])
  const gzip = Buffer.concat([
    head10,
    gzipSync(Buffer.from('yes gzipped')),
  ])

  cache.set('gz1', gzip)
  cache.set('gz2', gzip)
  cache.set('plain1', plain)
  cache.set('plain2', plain)

  await cache.promise()

  // gutcheck, make sure it got written to cache
  const g = new Cache({ path: t.testdirName })
  t.strictSame(
    await g.fetch('gz1'),
    Buffer.concat([head10, gzipSync(Buffer.from('yes gzipped'))]),
  )
  t.strictSame(
    await g.fetch('gz2'),
    Buffer.concat([head10, gzipSync(Buffer.from('yes gzipped'))]),
  )
  t.strictSame(
    await g.fetch('plain1'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
  t.strictSame(
    await g.fetch('plain2'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )

  const res = spawnSync(
    process.execPath,
    [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
    {
      input: 'gz1\0gz2\0plain1\0bogus\0',
      stdio: ['pipe', 'inherit', 'inherit'],
      env: ENV,
    },
  )
  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
    output: [null, null, null],
    pid: Number,
    stdout: null,
    stderr: null,
  })

  const c = new Cache({ path: t.testdirName })
  const resultHead = Buffer.concat([
    Buffer.from([0, 0, 0, 63]),
    Buffer.from([0, 0, 0]),
    Buffer.from([0, 0, 0, 'content-encoding'.length + 4]),
    Buffer.from('content-encoding'),
    Buffer.from([0, 0, 0, 'identity'.length + 4]),
    Buffer.from('identity'),
    Buffer.from([0, 0, 0, 'content-length'.length + 4]),
    Buffer.from('content-length'),
    Buffer.from([0, 0, 0, String('yes gzipped'.length).length + 4]),
    Buffer.from(String('yes gzipped'.length)),
  ])
  t.same(
    await c.fetch('gz1'),
    Buffer.concat([resultHead, Buffer.from('yes gzipped')]),
  )
  t.same(
    await c.fetch('gz2'),
    Buffer.concat([resultHead, Buffer.from('yes gzipped')]),
  )
  t.same(
    await c.fetch('plain1'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
  t.same(
    await c.fetch('plain2'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
})

t.test('unzip an entry that had headers', async t => {
  const unz = '{"hello":"world"}'
  const z = gzipSync(unz)
  const zheaders = Buffer.concat([
    Buffer.from([0, 0, 0, 'even'.length + 4]),
    Buffer.from('even'),
    Buffer.from([0, 0, 0, 'odd'.length + 4]),
    Buffer.from('odd'),
    Buffer.from([0, 0, 0, 'content-encoding'.length + 4]),
    Buffer.from('content-encoding'),
    Buffer.from([0, 0, 0, 'gzip'.length + 4]),
    Buffer.from('gzip'),
    Buffer.from([0, 0, 0, 'content-length'.length + 4]),
    Buffer.from('content-length'),
    Buffer.from([0, 0, 0, String(z.byteLength).length + 4]),
    Buffer.from(String(z.byteLength)),
  ])
  const zlen = zheaders.byteLength + 7
  const zipped = Buffer.concat(
    [Buffer.from([0, 0, 0, zlen]), Buffer.from('200'), zheaders, z],
    zlen + z.byteLength,
  )

  const resultHead = Buffer.concat([
    Buffer.from([0, 0, 0, 'even'.length + 4]),
    Buffer.from('even'),
    Buffer.from([0, 0, 0, 'odd'.length + 4]),
    Buffer.from('odd'),
    Buffer.from([0, 0, 0, 'content-encoding'.length + 4]),
    Buffer.from('content-encoding'),
    Buffer.from([0, 0, 0, 'identity'.length + 4]),
    Buffer.from('identity'),
    Buffer.from([0, 0, 0, 'content-length'.length + 4]),
    Buffer.from('content-length'),
    Buffer.from([0, 0, 0, String(unz.length).length + 4]),
    Buffer.from(String(unz.length)),
  ])
  const rlen = resultHead.byteLength + 7
  const result = Buffer.concat(
    [
      Buffer.from([0, 0, 0, rlen]),
      Buffer.from('200'),
      resultHead,
      Buffer.from(unz),
    ],
    rlen + unz.length,
  )

  const cache = new Cache({ path: t.testdir() })
  cache.set('gz1', zipped)
  await cache.promise()
  const res = spawnSync(
    process.execPath,
    [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: 'gz1\0',
      env: ENV,
    },
  )
  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
    output: [null, null, null],
    pid: Number,
    stdout: null,
    stderr: null,
  })
  const c = new Cache({ path: t.testdirName })
  t.same(await c.fetch('gz1'), result)
})

t.test('unzip an entry with integrity', async t => {
  const integrity: Integrity = `sha512-${createHash('sha512').update('just a random integrity value').digest('base64')}`
  const unz = '{"hello":"world"}'
  const z = gzipSync(unz)
  const zheaders = Buffer.concat([
    Buffer.from([0, 0, 0, 'integrity'.length + 4]),
    Buffer.from('integrity'),
    Buffer.from([0, 0, 0, integrity.length + 4]),
    Buffer.from(integrity),
    Buffer.from([0, 0, 0, 'content-encoding'.length + 4]),
    Buffer.from('content-encoding'),
    Buffer.from([0, 0, 0, 'identity'.length + 4]),
    Buffer.from('identity'),
    Buffer.from([0, 0, 0, 'content-length'.length + 4]),
    Buffer.from('content-length'),
    Buffer.from([0, 0, 0, String(z.byteLength).length + 4]),
    Buffer.from(String(z.byteLength)),
  ])
  const zlen = zheaders.byteLength + 7
  const zipped = Buffer.concat(
    [Buffer.from([0, 0, 0, zlen]), Buffer.from('200'), zheaders, z],
    zlen + z.byteLength,
  )

  const resultHead = Buffer.concat([
    Buffer.from([0, 0, 0, 'integrity'.length + 4]),
    Buffer.from('integrity'),
    Buffer.from([0, 0, 0, integrity.length + 4]),
    Buffer.from(integrity),
    Buffer.from([0, 0, 0, 'content-encoding'.length + 4]),
    Buffer.from('content-encoding'),
    Buffer.from([0, 0, 0, 'identity'.length + 4]),
    Buffer.from('identity'),
    Buffer.from([0, 0, 0, 'content-length'.length + 4]),
    Buffer.from('content-length'),
    Buffer.from([0, 0, 0, String(unz.length).length + 4]),
    Buffer.from(String(unz.length)),
  ])
  const rlen = resultHead.byteLength + 7
  const result = Buffer.concat(
    [
      Buffer.from([0, 0, 0, rlen]),
      Buffer.from('200'),
      resultHead,
      Buffer.from(unz),
    ],
    rlen + unz.length,
  )

  const cache = new Cache({ path: t.testdir() })
  cache.set('gz1', zipped, { integrity })
  await cache.promise()
  const res = spawnSync(
    process.execPath,
    [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: 'gz1\0',
      env: ENV,
    },
  )
  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
    output: [null, null, null],
    pid: Number,
    stdout: null,
    stderr: null,
  })
  const c = new Cache({ path: t.testdirName })
  t.same(await c.fetch('gz1'), result)
  const cacheFile = c.path('gz1')
  const integrityFile = c.integrityPath(integrity)!
  t.strictSame(
    await readFile(cacheFile, 'utf-8'),
    await readFile(integrityFile, 'utf-8'),
    'cache file and integrity are the same',
  )
  const cacheStat = await stat(cacheFile)
  const integrityStat = await stat(integrityFile)
  t.equal(
    cacheStat.dev,
    integrityStat.dev,
    'cache and integrity have same dev',
  )
  t.equal(
    cacheStat.ino,
    integrityStat.ino,
    'cache and integrity have same ino',
  )
  t.equal(
    cacheStat.nlink,
    integrityStat.nlink,
    'cache and integrity have same nlink',
  )
  t.equal(cacheStat.nlink, 2, 'nlink is 2')
})

t.test(
  'bomb left gzipped, other entries still processed',
  async t => {
    const cache = new Cache({ path: t.testdir() })
    const head10 = Buffer.alloc(10)
    head10.writeUint32BE(10, 0)
    const bomb = Buffer.concat([
      head10,
      gzipSync(Buffer.alloc(2 * 1024 * 1024)),
    ])
    const ok = Buffer.concat([
      head10,
      gzipSync(Buffer.from('yes gzipped')),
    ])
    cache.set('bomb', bomb)
    cache.set('ok', ok)
    await cache.promise()

    const res = spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
      {
        input: 'bomb\0ok\0',
        stdio: ['pipe', 'inherit', 'inherit'],
        env: ENV,
      },
    )
    t.equal(res.status, 0)

    const g = new Cache({ path: t.testdirName })
    t.strictSame(await g.fetch('bomb'), bomb, 'bomb untouched')
    const okAfter = await g.fetch('ok')
    t.ok(okAfter, 'ok entry present')
    t.strictSame(
      okAfter?.subarray(-'yes gzipped'.length),
      Buffer.from('yes gzipped'),
      'ok entry rewritten un-gzipped',
    )
  },
)

t.test('VLT_TAR_MAX_UNPACKED_BYTES caps rewrite', async t => {
  const cache = new Cache({ path: t.testdir() })
  const head10 = Buffer.alloc(10)
  head10.writeUint32BE(10, 0)
  const gz = Buffer.concat([
    head10,
    gzipSync(Buffer.from('yes gzipped')),
  ])
  cache.set('gz', gz)
  await cache.promise()

  const res = spawnSync(
    process.execPath,
    [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
    {
      input: 'gz\0',
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...ENV, VLT_TAR_MAX_UNPACKED_BYTES: '4' },
    },
  )
  t.equal(res.status, 0, 'not a failure')
  const g = new Cache({ path: t.testdirName })
  t.strictSame(await g.fetch('gz'), gz, 'entry left gzipped')
})

t.test('corrupt gzip still throws', async t => {
  const cache = new Cache({ path: t.testdir() })
  const head10 = Buffer.alloc(10)
  head10.writeUint32BE(10, 0)
  const bad = Buffer.concat([
    head10,
    Buffer.from([0x1f, 0x8b, 0xff, 0xff, 0xff, 0xff]),
  ])
  cache.set('bad', bad)
  await cache.promise()

  const res = spawnSync(
    process.execPath,
    [__CODE_SPLIT_SCRIPT_NAME, t.testdirName],
    {
      input: 'bad\0',
      stdio: ['pipe', 'inherit', 'ignore'],
      env: ENV,
    },
  )
  t.equal(res.status, 1)
})

t.test('global store', async t => {
  const tgz = gzipSync(pkgTar())
  const hex = hexOf(tgz)
  const tgzEntry = encodeEntry({ integrity: integrityOf(tgz) }, tgz)
  const run = async (
    t: Test,
    env: Record<string, string>,
    entries: Record<string, Buffer> = { tgz: tgzEntry },
  ) => {
    const dir = t.testdir()
    const path = resolve(dir, 'registry-client')
    const store = resolve(dir, 'store/v1')
    const cache = new Cache({ path })
    for (const [k, v] of Object.entries(entries)) cache.set(k, v)
    await cache.promise()
    const res = spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, path, store],
      {
        input: Object.keys(entries).join('\0') + '\0',
        stdio: ['pipe', 'inherit', 'pipe'],
        encoding: 'utf8',
        env: { ...ENV, ...env },
      },
    )
    const unzipped = await new Cache({ path }).fetch('tgz')
    return {
      dir,
      store,
      res,
      gzipped: unzipped?.subarray(-tgz.length).equals(tgz),
    }
  }

  t.test('explodes after unzipping', async t => {
    const { store, res, gzipped } = await run(t, {
      VLT_STORE_LINKER: 'hardlink',
      NODE_DEBUG: 'vlt',
    })
    t.equal(res.status, 0)
    t.equal(gzipped, false, 'cache entry unzipped')
    t.strictSame(
      readdirSync(store).sort(),
      ['.tmp', hex, `${hex}.json`].sort(),
    )
    t.match(
      res.stderr,
      /explode written=1 skipped=0 ignored=0 failed=0 bytes=\d+ ms=\d+/,
    )
  })

  t.test('key with the integrity it is cached under', async t => {
    const dir = t.testdir()
    const path = resolve(dir, 'registry-client')
    const store = resolve(dir, 'store/v1')
    const integrity = integrityOf(tgz)
    const cache = new Cache({ path })
    cache.set('tgz', tgzEntry, { integrity })
    await cache.promise()
    rmSync(cache.path('tgz'))
    rmSync(cache.path('tgz') + '.key')
    const res = spawnSync(
      process.execPath,
      [__CODE_SPLIT_SCRIPT_NAME, path, store],
      {
        input: `tgz\t${integrity}\0`,
        env: { ...ENV, VLT_STORE_LINKER: 'hardlink' },
      },
    )
    t.equal(res.status, 0)
    t.ok(existsSync(resolve(store, hex)))
  })

  t.test('VLT_CACHE_UNZIP=0 only explodes', async t => {
    const env = {
      ...ENV,
      VLT_STORE_LINKER: 'auto',
      VLT_CACHE_UNZIP: '0',
      NODE_DEBUG: 'vlt',
    }
    const { dir, store, res, gzipped } = await run(t, env)
    t.equal(res.status, 0)
    t.equal(gzipped, true, 'cache entry left gzipped')
    t.ok(existsSync(resolve(store, hex)))

    const again = spawnSync(
      process.execPath,
      [
        __CODE_SPLIT_SCRIPT_NAME,
        resolve(dir, 'registry-client'),
        store,
      ],
      { input: 'tgz\0', encoding: 'utf8', env },
    )
    t.equal(again.status, 0, 'store already full')
    t.match(again.stderr, /explode written=0 skipped=1 /)
  })

  t.test(
    'failed explode exits 1, the rest still written',
    async t => {
      const bad = Buffer.from('not a tarball')
      const { store, res } = await run(
        t,
        { VLT_STORE_LINKER: 'hardlink', VLT_CACHE_UNZIP: '0' },
        {
          bad: encodeEntry({ integrity: integrityOf(bad) }, bad),
          tgz: tgzEntry,
        },
      )
      t.equal(res.status, 1)
      t.ok(existsSync(resolve(store, hex)))
      t.notOk(existsSync(resolve(store, hexOf(bad))))
    },
  )

  t.test('nothing written without a store linker', async t => {
    const envs: Record<string, string>[] = [
      {},
      { VLT_STORE_LINKER: 'unpack' },
    ]
    for (const env of envs) {
      const { dir, res, gzipped } = await run(t, env)
      t.equal(res.status, 0)
      t.equal(gzipped, false, 'cache entry unzipped')
      t.strictSame(readdirSync(dir), ['registry-client'], 'no store')
    }
    const { res } = await run(t, { VLT_CACHE_UNZIP: '0' })
    t.equal(res.status, 0, 'nothing done, not a failure')
  })

  t.test('corrupt gzip does not block the store', async t => {
    const head10 = Buffer.alloc(10)
    head10.writeUint32BE(10, 0)
    const { store, res } = await run(
      t,
      { VLT_STORE_LINKER: 'hardlink' },
      {
        bad: Buffer.concat([
          head10,
          Buffer.from([0x1f, 0x8b, 0xff, 0xff, 0xff, 0xff]),
        ]),
        tgz: tgzEntry,
      },
    )
    t.equal(res.status, 1, 'still throws')
    t.ok(existsSync(resolve(store, hex)))
  })
})

t.test('lowest priority only with the global store on', async t => {
  const cases: [string, string[], number[]][] = [
    ['hardlink', ['/s'], [19]],
    ['unpack', ['/s'], []],
    ['hardlink', [], []],
  ]
  for (const [linker, store, want] of cases) {
    const calls: number[] = []
    const input = new EventEmitter()
    input.on('newListener', (ev: string) => {
      if (ev === 'end') process.nextTick(() => input.emit('end'))
    })
    t.intercept(process, 'stdin', { value: input })
    t.intercept(process, 'title', {
      value: process.title,
      writable: true,
    })
    t.intercept(process, 'argv', {
      value: [
        process.execPath,
        __CODE_SPLIT_SCRIPT_NAME,
        t.testdirName,
        ...store,
      ],
    })
    t.intercept(process, 'env', {
      value: { ...process.env, VLT_STORE_LINKER: linker },
    })
    await t.mockImport<typeof import('../src/unzip.ts')>(
      '../src/unzip.ts',
      {
        'node:os': {
          ...os,
          setPriority: (n: number) => calls.push(n),
        },
      },
    )
    t.strictSame(calls, want, `${linker} ${store.length}`)
  }
  const exits: number[] = []
  t.intercept(process, 'exit', {
    value: (c: number) => exits.push(c),
  })
  t.intercept(process, 'argv', {
    value: [process.execPath, __CODE_SPLIT_SCRIPT_NAME],
  })
  await t.mockImport<typeof import('../src/unzip.ts')>(
    '../src/unzip.ts',
  )
  t.strictSame(exits, [1], 'no path')
})
