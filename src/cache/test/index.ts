import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
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

  const [_, integrity] = makeValueIntegrity('hello, world')
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
    const [value, integrity] = makeValueIntegrity('hello, world')

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
    const [value, integrity] = makeValueIntegrity('red')

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
    const [value, integrity] = makeValueIntegrity(
      'b',
      'yolo' as Integrity,
    )

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

  t.test('integrity file exists and links to value file', async t => {
    const cache = new Cache({ path: t.testdir() })
    const [value, integrity] = makeValueIntegrity('same content')
    const key = 'key'

    // Set first time to create files
    cache.set(key, value, { integrity })
    await cache.promise()

    // Set again with same key and integrity
    // Should detect they're already linked and same size
    cache.set(key, value, { integrity })
    await cache.promise()

    // Verify they're actually hard linked
    const valPath = cache.path(key)
    const intPath = cache.integrityPath(integrity)!

    const valStats = await stat(valPath)
    const intStats = await stat(intPath)

    t.equal(valStats.ino, intStats.ino, 'files share same inode')
    t.equal(valStats.dev, intStats.dev, 'files on same device')
    t.equal(valStats.size, value.length, 'file has correct size')
    t.equal(valStats.nlink, 2, 'inode has 2 links')
  })

  t.test(
    'integrity file exists but different size than value',
    async t => {
      const cache = new Cache({ path: t.testdir() })
      const [value1, integrity] = makeValueIntegrity(
        'original content',
      )
      const [value2] = makeValueIntegrity(
        'different and longer content',
      )
      const key = 'key'

      // Set first time
      cache.set(key, value1, { integrity })
      await cache.promise()

      // Set with different content but same integrity
      // Should overwrite the integrity file
      cache.set(key, value2, { integrity })
      await cache.promise()

      // Verify files match the new content
      const valPath = cache.path(key)
      const intPath = cache.integrityPath(integrity)!

      const valContent = await readFile(valPath)
      const intContent = await readFile(intPath)

      t.strictSame(valContent, value2, 'value file has new content')
      t.strictSame(
        intContent,
        value2,
        'integrity file has new content',
      )

      const valStats = await stat(valPath)
      const intStats = await stat(intPath)

      t.equal(valStats.ino, intStats.ino, 'files share same inode')
      t.equal(valStats.size, value2.length, 'file has correct size')
    },
  )

  t.test(
    'value file does not exist but integrity exists',
    async t => {
      const cache = new Cache({ path: t.testdir() })
      const [value, integrity] = makeValueIntegrity('test content')

      // Set first time to create integrity file
      cache.set('key1', value, { integrity })
      await cache.promise()

      // Now set with a different key but same integrity
      // Should link the new key to existing integrity file
      cache.set('key2', value, { integrity })
      await cache.promise()

      const valPath1 = cache.path('key1')
      const valPath2 = cache.path('key2')
      const intPath = cache.integrityPath(integrity)!

      const valStats1 = await stat(valPath1)
      const valStats2 = await stat(valPath2)
      const intStats = await stat(intPath)

      t.equal(
        valStats1.ino,
        intStats.ino,
        'first file shares inode with integrity',
      )
      t.equal(
        valStats2.ino,
        intStats.ino,
        'second file shares inode with integrity',
      )
      t.equal(
        valStats1.nlink,
        3,
        'inode has 3 links (2 keys + integrity)',
      )
    },
  )

  t.test(
    'integrity file exists with different content and size',
    async t => {
      const cache = new Cache({ path: t.testdir() })
      const [value1, integrity1] = makeValueIntegrity(
        'original content',
      )
      const [value2, integrity2] = makeValueIntegrity(
        'completely different',
      )

      // Create first integrity file
      cache.set('key1', value1, { integrity: integrity1 })
      await cache.promise()

      // Create new file with different integrity
      cache.set('key2', value2, { integrity: integrity2 })
      await cache.promise()

      // Now set with key1 but integrity2
      // Should link to integrity2
      cache.set('key1', value2, { integrity: integrity2 })
      await cache.promise()

      const valPath1 = cache.path('key1')
      const intPath2 = cache.integrityPath(integrity2)!

      // Check content
      const valContent1 = await readFile(valPath1)
      t.strictSame(valContent1, value2, 'key1 now has value2 content')

      // Check stats - key1 should be linked to integrity2
      const valStats1 = await stat(valPath1)
      const intStats2 = await stat(intPath2)
      t.equal(
        valStats1.ino,
        intStats2.ino,
        'key1 shares inode with integrity2',
      )

      // Verify key2 has the correct content
      const valPath2 = cache.path('key2')
      const valContent2 = await readFile(valPath2)
      t.strictSame(valContent2, value2, 'key2 has correct content')
    },
  )
})
