import t from 'tap'
import { DecodedMemo } from '../src/decoded-memo.ts'
import type { CacheEntry } from '../src/cache-entry.ts'

const entry = (n: number) => ({ n }) as unknown as CacheEntry
const buf = (bytes: number) => new Uint8Array(bytes)

t.test('round trips a value', async t => {
  const m = new DecodedMemo()
  const k = buf(8)
  t.equal(m.get(k), undefined, 'miss before set')
  const e = entry(1)
  m.set(k, e)
  t.equal(m.get(k), e, 'hit after set')
  t.equal(m.count, 1)
  t.equal(m.size, 8)
})

t.test('evicts under a byte budget', async t => {
  // budget holds exactly 4 of these
  const m = new DecodedMemo(400)
  const keys = Array.from({ length: 6 }, () => buf(100))
  keys.forEach((k, i) => m.set(k, entry(i)))
  t.equal(m.count, 4, 'bounded to the budget')
  t.equal(m.size, 400, 'size tracks the held buffers')
  t.equal(m.get(keys[0]!), undefined, 'oldest evicted')
  t.equal(m.get(keys[1]!), undefined, 'second oldest evicted')
  t.ok(m.get(keys[5]!), 'newest retained')
})

t.test('a hit is the most recent, so it survives', async t => {
  const m = new DecodedMemo(300)
  const a = buf(100)
  const b = buf(100)
  const c = buf(100)
  m.set(a, entry(0))
  m.set(b, entry(1))
  m.set(c, entry(2))
  t.ok(m.get(a), 'a still held')
  // a is now the most recent; inserting one more must evict b, not a
  m.set(buf(100), entry(3))
  t.ok(m.get(a), 'a survived because it was used')
  t.equal(m.get(b), undefined, 'b evicted instead')
})

t.test('re-setting the same key does not double count', async t => {
  const m = new DecodedMemo(300)
  const k = buf(100)
  m.set(k, entry(0))
  m.set(k, entry(1))
  t.equal(m.count, 1)
  t.equal(m.size, 100)
  t.match(m.get(k), { n: 1 }, 'latest value wins')
})

t.test('a buffer larger than the budget is not held', async t => {
  const m = new DecodedMemo(100)
  const k = buf(101)
  m.set(k, entry(0))
  t.equal(m.count, 0, 'not stored')
  t.equal(m.size, 0, 'size unchanged')
  t.equal(m.get(k), undefined)
})

t.test('zero-length buffers count as one byte', async t => {
  const m = new DecodedMemo(2)
  const a = buf(0)
  const b = buf(0)
  const c = buf(0)
  m.set(a, entry(0))
  m.set(b, entry(1))
  m.set(c, entry(2))
  t.equal(m.count, 2, 'still bounded when every key is empty')
})

t.test('clear drops everything', async t => {
  const m = new DecodedMemo()
  m.set(buf(10), entry(0))
  m.clear()
  t.equal(m.count, 0)
  t.equal(m.size, 0)
})
