import t from 'tap'
import { deleteHeader } from '../src/delete-header.ts'

const k = 'key'
const v = 'value'

t.strictSame(deleteHeader(null, k), {})
t.strictSame(deleteHeader(undefined, k), {})
t.strictSame(deleteHeader([], k), [])
t.strictSame(deleteHeader({ x: 'y' }, 'x'), {})
t.strictSame(deleteHeader([k, v, 'x', 'y'], k), ['x', 'y'])
t.strictSame(deleteHeader(['x', 'y', k, v], k), ['x', 'y'])
t.strictSame(
  deleteHeader(
    [
      ['x', 'y'],
      [k, v],
    ],
    k,
  ),
  [['x', 'y']],
)
t.strictSame(
  deleteHeader(
    [
      [k, v],
      ['x', 'y'],
    ],
    k,
  ),
  [['x', 'y']],
)

t.strictSame(deleteHeader(['x', 'y'], k), ['x', 'y'])
t.strictSame(deleteHeader([['x', 'y']], k), [['x', 'y']])

t.strictSame(
  deleteHeader(
    (function* (): Generator<[string, string]> {
      yield ['x', 'y']
      yield [k, v]
    })(),
    k,
  ),
  [['x', 'y']],
)
