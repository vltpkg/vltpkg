import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import type { Stats } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import { Cache } from '../src/index.ts'
import type { Integrity } from '@vltpkg/types'

const makeValueIntegrity = (
  str: string,
  fakeIntegrity?: Integrity,
): [Buffer, Integrity] => {
  const value = Buffer.from(str)
  const integrity: Integrity =
    fakeIntegrity ??
    (`sha512-${createHash('sha512')
      .update(value)
      .digest('base64')}` as const)
  return [value, integrity]
}

t.test('basic cache operation', async t => {
  const hash =
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
    '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728'
  let odwCalled = false
  const c = new Cache({
    path: t.testdir(),
    onDiskWrite(path, key, data) {
      odwCalled = true
      t.equal(path, resolve(t.testdirName, hash))
      t.equal(key, 'xyz')
      t.same(data, Buffer.from('hello, world'))
    },
  })
  t.equal(c.path(), t.testdirName)
  t.equal(c.max, Cache.defaultMax)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.equal(odwCalled, true)
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), [hash, `${hash}.key`])

  const reader = new Cache({
    path: t.testdirName,
  })
  t.equal(reader.get('xyz'), undefined)
  t.equal(String(await reader.fetch('xyz')), 'hello, world')
  t.equal(String(reader.fetchSync('xyz')), 'hello, world')
  t.equal(String(reader.get('xyz')), 'hello, world')

  const readerSync = new Cache({
    path: t.testdirName,
  })
  t.equal(String(readerSync.fetchSync('xyz')), 'hello, world')

  const limited = new Cache({
    path: t.testdirName,
    maxEntrySize: 5,
  })
  // can still read from the disk, but won't cache in memory
  t.equal(String(await limited.fetch('xyz')), 'hello, world')
  t.equal(limited.size, 0)

  // promise awaits new things added while awaiting
  // this is a race, but should work the same either way it lands
  const waiter = new Cache({
    path: t.testdirName,
  })
  waiter.set('true', Buffer.from('true'))
  waiter.set('false', Buffer.from('false'))
  const p = waiter.promise()
  waiter.set('svn', Buffer.from([7]))
  waiter.set('eit', Buffer.from([8]))
  await p
  t.strictSame(waiter.pending, [])
})

t.test('delete from disk', async t => {
  const hash =
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
    '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728'
  let oddCalled = false
  const c = new Cache({
    path: t.testdir(),
    onDiskDelete(path, key, deleted) {
      oddCalled = true
      t.equal(path, resolve(t.testdirName, hash))
      t.equal(key, 'xyz')
      t.equal(deleted, true)
    },
  })
  t.equal(c.max, Cache.defaultMax)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), [hash, `${hash}.key`])
  c.delete('xyz')
  t.strictSame([...c.keys()], [])
  await c.promise()
  t.equal(oddCalled, false, 'does not call diskDelete by default')
  t.same(readdirSync(t.testdirName), [hash, `${hash}.key`])

  const [, integrity] = makeValueIntegrity('hello, world')
  c.delete('xyz', true, integrity)
  await c.promise()
  t.equal(oddCalled, true, 'diskDelete has now been called')
  t.strictSame(readdirSync(t.testdirName), [])
})

t.test('walk over cached items', async t => {
  const c = new Cache({ path: t.testdir() })
  t.equal(c.max, Cache.defaultMax)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  const a = new Cache({ path: t.testdirName })
  const entries: [string, Buffer][] = []
  const asyncIterable: AsyncIterable<[string, Buffer]> = a
  // eslint-disable-next-line @typescript-eslint/await-thenable
  for await (const kv of asyncIterable) {
    entries.push(kv)
  }
  const entriesSync: [string, Buffer][] = []
  const s = new Cache({ path: t.testdirName })
  for (const kv of s) {
    entriesSync.push(kv)
  }
  t.same(a, s)
  t.same(a, [['xyz', Buffer.from('hello, world')]])
})

t.test('integrity', async t => {
  // Set a value in the cache, with a possible integrity value.
  // Then wait for the cache to be written and clear the in-memory cache
  // so the value is only persisted to disk.
  const cacheSet = async (
    c: Cache,
    k: string,
    v: Buffer,
    integrity?: Integrity,
  ) => {
    c.set(k, v, { integrity })
    await c.promise()
    c.clear()
  }

  const statKeys = async (path: string | undefined) => {
    const stats = path ? await stat(path) : ({} as Stats)
    return {
      dev: stats.dev,
      ino: stats.ino,
      size: stats.size,
      nlink: stats.nlink,
    }
  }

  t.test('fetch by integrity (sync and async)', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity('hello, world')

    await cacheSet(cache, 'key', value, integrity)

    t.strictSame(
      await cache.fetch('otherkey', { context: { integrity } }),
      value,
    )
    t.strictSame(
      cache.fetchSync('yolo', { context: { integrity } }),
      value,
    )
  })

  t.test('fetch with missing integrity', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity('red')

    await cacheSet(cache, 'apple', value, undefined)

    // if we fetch with integrity, and the key exists
    // but not the integrity, then link integrity.
    t.strictSame(
      await cache.fetch('apple', { context: { integrity } }),
      value,
    )
    t.strictSame(
      await cache.fetch('red things', { context: { integrity } }),
      value,
    )
  })

  t.test('set with bad integrity', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity(
      'b',
      'yolo' as Integrity,
    )

    await cacheSet(cache, 'a', value, integrity)

    t.throws(() => cache.integrityPath(integrity))

    // it should have written the file, but the integrity didn't get written
    t.strictSame(
      await cache.fetch('a', { context: { integrity } }),
      value,
    )
    t.equal(
      await cache.fetch('x', { context: { integrity } }),
      undefined,
    )
  })

  t.test('linked integrity file exists', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity('content')
    const key = 'key'
    const key2 = 'key2'

    // Set first time to create files
    await cacheSet(cache, key, value, integrity)
    // Set again with same key and integrity
    // Should detect they're already linked and same size
    await cacheSet(cache, key, value, integrity)
    // Now set with a different key but same integrity
    // Should link the new key to existing integrity file
    await cacheSet(cache, key2, value, integrity)

    const valStats1 = await statKeys(cache.path(key))
    t.strictSame(
      valStats1,
      await statKeys(cache.path(key2)),
      'file 1 and file 2 are linked',
    )
    t.strictSame(
      valStats1,
      await statKeys(cache.integrityPath(integrity)),
      'file 1 and integrity are linked',
    )
    t.equal(valStats1.size, value.length, 'file has correct size')
    t.equal(valStats1.nlink, 3, 'nlink=3 (2 keys + integrity)')
  })

  t.test('integrity file exists with different content', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value1, integrity1] = makeValueIntegrity('content')
    const [value2, integrity2] = makeValueIntegrity('not content')
    const key1 = 'key1'
    const key2 = 'key2'

    // Create first integrity file
    await cacheSet(cache, key1, value1, integrity1)
    // Create new file with different integrity
    await cacheSet(cache, key2, value2, integrity2)
    // Now set with key1 but integrity2
    // Should link to integrity2
    await cacheSet(cache, key1, value2, integrity2)

    t.strictSame(
      await readFile(cache.path(key1)),
      value2,
      'key1 now has value2 content',
    )
    t.strictSame(
      await readFile(cache.path(key2)),
      value2,
      'key2 has correct content',
    )
    // Check stats - key1 should be linked to integrity2
    t.strictSame(
      await statKeys(cache.path(key1)),
      await statKeys(cache.integrityPath(integrity2)),
      'key1 and integrity2 are linked',
    )
  })

  t.test('messed up integrity file', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity('content')
    const key = 'key'

    // Set first time to create files
    await cacheSet(cache, key, value, integrity)
    // Something (maybe another cache-unzip process) wrote something
    // else to the integrity file
    await writeFile(cache.integrityPath(integrity)!, 'im a bad guy')
    // Set again with same key and integrity
    // Should detect that something is wrong with the integrity file
    // and rewrite it
    await cacheSet(cache, key, value, integrity)

    t.strictSame(
      await readFile(cache.path(key)),
      value,
      'value has correct content',
    )
    t.strictSame(
      await readFile(cache.integrityPath(integrity)!),
      value,
      'integrity has correct content',
    )
    t.strictSame(
      await statKeys(cache.path(key)),
      await statKeys(cache.integrityPath(integrity)),
      'value and integrity are linked',
    )
  })
})
