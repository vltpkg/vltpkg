#!/usr/bin/env -S tap -Rtap --disable-coverage --allow-empty-coverage
import t from 'tap'
import { fastSplit } from '../../src/index.ts'

const str = '1.2.3-asdf+foo'

const test = (fn: () => void, howLong = 1000) => {
  const start = performance.now()
  let ops = 0
  while (performance.now() - start < howLong) {
    fn()
    ops++
  }
  return ops / (performance.now() - start)
}

const fastSplitTest = () => fastSplit(str, '.')
const splitTest = () => str.split('.')

const splitEmptyCheck = () => {
  const parts = str.split('.')
  for (const _ of parts) {
    // empty
  }
  return parts
}
const fastSplitEmptyCheck = () =>
  fastSplit(str, '.', -1, (_part, _ret, _i) => {})

const splitTransformLoop = () => {
  const parts = str.split('.')
  const ret = []
  for (const p of parts) {
    ret.push(p.toUpperCase())
  }
  return ret
}

const splitTransformMap = () =>
  str.split('.').map(p => p.toUpperCase())

const fastSplitTransform = () =>
  fastSplit(str, '.', -1, (part, _ret, _i) => part.toUpperCase())

const splitLimit = () => str.split('.', 2)
const fastSplitLimit = () => fastSplit(str, '.', 2)

t.strictSame(fastSplitTest(), splitTest(), 'gut check')

t.test('basic splitting', t => {
  const s = test(splitTest)
  const fs = test(fastSplitTest)
  t.comment('split', s)
  t.comment('fastSplit', fs)
  t.comment(fs / s)
  t.equal(fs > s, true, 'faster')
  t.end()
})

t.test('empty method', t => {
  const s = test(splitEmptyCheck)
  const fs = test(fastSplitEmptyCheck)
  t.comment('split', s)
  t.comment('fastSplit', fs)
  t.comment(fs / s)
  t.equal(fs > s, true, 'faster')
  t.end()
})

t.test('transform', t => {
  const sl = test(splitTransformLoop)
  const sm = test(splitTransformMap)
  const fs = test(fastSplitTransform)
  t.comment('split transform loop', sl)
  t.comment('split transform map', sm)
  t.comment('fastSplit transform', fs)
  t.equal(fs > sl, true, 'faster than split+loop')
  t.equal(fs > sm, true, 'faster than split+map')
  t.end()
})

t.test('limits', t => {
  const s = test(splitLimit)
  const fs = test(fastSplitLimit)
  t.comment('splitLimit', s)
  t.comment('fastSplitLimit', fs)
  t.comment(fs / s)
  t.equal(fs > s, true, 'faster')
  t.end()
})
