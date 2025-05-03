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

t.strictSame(fastSplit(str, '.'), str.split('.'), 'gut check')

t.test('basic splitting', t => {
  const fastSplitTest = () => fastSplit(str, '.')
  const splitTest = () => str.split('.')

  const s = test(splitTest)
  const fs = test(fastSplitTest)
  const factor = fs / s
  t.comment('split', s)
  t.comment('fastSplit', fs)
  t.comment('factor', factor)
  t.ok(factor > 0.7, '0.7x faster')
  t.end()
})

t.test('empty method', t => {
  const splitEmptyCheck = () => {
    const parts = str.split('.')
    for (const _ of parts) {
      // empty
    }
    return parts
  }
  const fastSplitEmptyCheck = () =>
    fastSplit(str, '.', -1, (_part, _ret, _i) => {})

  const s = test(splitEmptyCheck)
  const fs = test(fastSplitEmptyCheck)
  const factor = fs / s
  t.comment('split', s)
  t.comment('fastSplit', fs)
  t.comment('factor', factor)
  t.ok(factor > 0.8, '0.75x faster')
  t.end()
})

t.test('transform', t => {
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

  const sl = test(splitTransformLoop)
  const sm = test(splitTransformMap)
  const fs = test(fastSplitTransform)
  const loopFactor = fs / sl
  const mapFactor = fs / sm
  t.comment('split transform loop', sl)
  t.comment('split transform map', sm)
  t.comment('fastSplit transform', fs)
  t.comment('loop factor', loopFactor)
  t.comment('map factor', mapFactor)
  t.ok(loopFactor > 0.8, '0.8x faster than split+loop')
  t.ok(mapFactor > 0.8, '0.8x faster than split+map')
  t.end()
})

t.test('limits', t => {
  const splitLimit = () => str.split('.', 2)
  const fastSplitLimit = () => fastSplit(str, '.', 2)

  const s = test(splitLimit)
  const fs = test(fastSplitLimit)
  const factor = fs / s
  t.comment('splitLimit', s)
  t.comment('fastSplitLimit', fs)
  t.comment('factor', factor)
  t.ok(factor > 1, '1x faster')
  t.end()
})
