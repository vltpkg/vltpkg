import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import { Cache } from '../src/index.ts'
import type { Integrity } from '@vltpkg/types'

t.test('basic cache operation', async t => {
  let odwCalled = false
  const c = new Cache({
    path: t.testdir(),
    onDiskWrite(path, key, data) {
      odwCalled = true
      t.equal(
        path,
        resolve(
          t.testdirName,
          '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
            '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
        ),
      )
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
  t.same(readdirSync(t.testdirName), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])

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
  let oddCalled = false
  const c = new Cache({
    path: t.testdir(),
    onDiskDelete(path, key, deleted) {
      oddCalled = true
      t.equal(
        path,
        resolve(
          t.testdirName,
          '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
            '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
        ),
      )
      t.equal(key, 'xyz')
      t.equal(deleted, true)
    },
  })
  t.equal(c.max, Cache.defaultMax)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete('xyz')
  t.strictSame([...c.keys()], [])
  await c.promise()
  t.equal(oddCalled, false, 'does not call diskDelete by default')
  t.same(readdirSync(t.testdirName), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete(
    'xyz',
    true,
    `sha512-${createHash('sha512').update('hello, world').digest('base64')}`,
  )
  await c.promise()
  t.equal(oddCalled, true, 'diskDelete has now been called')
  t.strictSame(readdirSync(t.testdirName), [])
})

t.test('walk over cached items', async t => {
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  const a = new Cache({ path: t.testdirName })
  const entries: [string, Buffer][] = []
  for await (const kv of a) {
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
  t.test('basic', async t => {
    const cache = new Cache({ path: t.testdir() })

    const value = Buffer.from('hello, world')
    const integrity = `sha512-${createHash('sha512')
      .update(value)
      .digest('base64')}` as const

    cache.set('key', value, { integrity })
    await cache.promise()

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

    const value = Buffer.from('red')
    const integrity = `sha512-${createHash('sha512')
      .update(value)
      .digest('base64')}` as const

    cache.set('apple', value, { integrity: undefined })
    await cache.promise()
    cache.clear()

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

    const value = Buffer.from('b')
    const integrity = 'yolo' as Integrity

    cache.set('a', value, { integrity })
    await cache.promise()

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
})
