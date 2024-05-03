import t from 'tap'
import { fastSplit } from '../src/fast-split.js'

t.strictSame(fastSplit('a.b.c.d', '.'), ['a', 'b', 'c', 'd'])
t.strictSame(fastSplit('a.b.c.d', '.', 2), ['a', 'b.c.d'])
t.strictSame(
  fastSplit('a.b.c.d', '.', 2, c => c.toUpperCase()),
  ['A', 'B.C.D'],
)

t.strictSame(
  fastSplit('a.b.c.d', '.', -1, () => {}),
  ['a', 'b', 'c', 'd'],
)
t.strictSame(
  fastSplit('a.b.c.d', '.', 2, () => null),
  ['a', 'b.c.d'],
)
