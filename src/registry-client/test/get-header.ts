import t from 'tap'
import { getHeader } from '../src/get-header.ts'

t.equal(getHeader(undefined, 'x'), undefined)
t.equal(getHeader(null, 'x'), undefined)
t.equal(getHeader([], 'x'), undefined)
t.equal(getHeader({ x: 'y' }, 'x'), 'y')
t.equal(getHeader({ x: 'y' }, 'a'), undefined)
t.equal(getHeader(['x', 'y'], 'x'), 'y')
t.equal(getHeader(['x', 'y'], 'a'), undefined)
const h2d: [string, string][] = [
  ['x', 'y'],
  ['a', 'b'],
]
t.equal(getHeader(h2d, 'x'), 'y')
t.equal(getHeader(h2d, 'a'), 'b')
t.equal(getHeader(h2d, 'c'), undefined)
t.equal(
  getHeader(
    (function* (): Generator<[string, string]> {
      yield ['x', 'y']
    })(),
    'x',
  ),
  'y',
)
t.equal(
  getHeader(
    (function* (): Generator<[string, string]> {
      yield ['x', 'y']
    })(),
    'a',
  ),
  undefined,
)
