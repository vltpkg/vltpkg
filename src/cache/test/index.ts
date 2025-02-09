import { createHash } from 'crypto'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import t from 'tap'
import { Cache } from '../src/index.ts'

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
  c.delete('xyz', true)
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
  const c = new Cache({ path: t.testdir() })
  const value = Buffer.from('hello, world')
  const integrity = `sha512-${createHash('sha512')
    .update(value)
    .digest('base64')}` as const
  c.set('key', value, { integrity })
  await c.promise()

  const sameInt = await c.fetch('otherkey', {
    context: { integrity },
  })
  t.strictSame(sameInt, value)
  const sameSync = c.fetchSync('yolo', { context: { integrity } })
  t.strictSame(sameSync, value)

  // if we fetch with integrity, and the key exists
  // but not the integrity, then link integrity.
  c.set('apple', Buffer.from('red'))
  await c.promise()
  const red = Buffer.from('red')
  const redInt = `sha512-${createHash('sha512')
    .update(red)
    .digest('base64')}` as const

  const d = new Cache({ path: t.testdirName })
  t.strictSame(
    await d.fetch('apple', { context: { integrity: redInt } }),
    red,
  )
  t.strictSame(
    await d.fetch('red things', { context: { integrity: redInt } }),
    red,
  )

  const b = Buffer.from('b')
  //@ts-expect-error
  d.set('a', b, { integrity: 'yolo' })
  //@ts-expect-error
  t.throws(() => d.integrityPath('yolo'))
  await d.promise()
  const e = new Cache({ path: t.testdirName })
  // it should have written the file, but the integrity didn't get written
  t.strictSame(
    //@ts-expect-error
    await e.fetch('a', { context: { integrity: 'yolo' } }),
    b,
  )
  t.equal(
    //@ts-expect-error
    await e.fetch('x', { context: { integrity: 'yolo' } }),
    undefined,
  )
})
