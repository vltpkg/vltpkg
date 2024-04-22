import t from 'tap'
import { addHeader } from '../dist/esm/add-header.js'

const k = 'key'
const v = 'value'

t.strictSame(addHeader(null, k, v), { key: v })
t.strictSame(addHeader(undefined, k, v), { key: v })
t.strictSame(addHeader({ x: 'y' }, k, v), { x: 'y', key: v })
t.strictSame(addHeader([], k, v), [[k, v]])
t.strictSame(addHeader(['x', 'y'], k, v), ['x', 'y', k, v])
t.strictSame(addHeader([['x', 'y']], k, v), [
  ['x', 'y'],
  [k, v],
])
t.strictSame(
  addHeader(
    (function* (): Generator<[string, string]> {
      yield ['x', 'y']
    })(),
    k,
    v,
  ),
  [
    ['x', 'y'],
    [k, v],
  ],
)
