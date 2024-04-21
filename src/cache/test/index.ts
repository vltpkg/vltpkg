import { readdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import t from 'tap'
import { Cache } from '../dist/esm/index.js'

t.test('basic cache operation', async t => {
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  t.equal(c.ttl, Cache.defaultTTL)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
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
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  t.equal(c.ttl, Cache.defaultTTL)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete('xyz')
  t.strictSame([...c.keys()], [])
  await c.promise()
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete('xyz', true)
  await c.promise()
  t.strictSame(readdirSync(t.testdirName), [])
})

t.test('delete from disk, no vacuuming if uncles', async t => {
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  t.equal(c.ttl, Cache.defaultTTL)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete('xyz')
  t.strictSame([...c.keys()], [])
  await c.promise()
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  writeFileSync(resolve(t.testdirName, '4a/uncle'), '')
  c.delete('xyz', true)
  await c.promise()
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['uncle'])
})

t.test('delete from disk, no vacuuming if siblings', async t => {
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  t.equal(c.ttl, Cache.defaultTTL)
  c.set('xyz', Buffer.from('hello, world'))
  await c.promise()
  t.same([...c.keys()], ['xyz'])
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  c.delete('xyz')
  t.strictSame([...c.keys()], [])
  await c.promise()
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), [
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728',
    '4a3ed8147e37876adc8f76328e5abcc1b470e6acfc18efea0135f983604953a5' +
      '8e183c1a6086e91ba3e821d926f5fdeb37761c7ca0328a963f5e92870675b728.key',
  ])
  writeFileSync(resolve(t.testdirName, '4a/3e/sibling'), '')
  c.delete('xyz', true)
  await c.promise()
  t.same(readdirSync(t.testdirName), ['4a'])
  t.same(readdirSync(t.testdirName + '/4a'), ['3e'])
  t.same(readdirSync(t.testdirName + '/4a/3e'), ['sibling'])
})

t.test('walk over cached items', async t => {
  const c = new Cache({
    path: t.testdir(),
  })
  t.equal(c.max, Cache.defaultMax)
  t.equal(c.ttl, Cache.defaultTTL)
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
  t.same(a, [['xyz', Buffer.from('hello, world') ]])
})
