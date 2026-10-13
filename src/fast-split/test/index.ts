import t from 'tap'
import { fastSplit } from '../src/index.ts'

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

t.test('limit 2 and 3 without a transform', t => {
  t.strictSame(fastSplit('a b c', ' ', 2), ['a', 'b c'])
  t.strictSame(fastSplit('a b', ' ', 2), ['a', 'b'])
  t.strictSame(fastSplit('a ', ' ', 2), ['a', ''])
  t.strictSame(fastSplit(' a', ' ', 2), ['', 'a'])
  t.strictSame(fastSplit('abc', ' ', 2), ['abc'])
  t.strictSame(fastSplit('', ' ', 2), [''])
  t.strictSame(fastSplit('a||b||c', '||', 2), ['a', 'b||c'])

  t.strictSame(fastSplit('1.2.3-a.b+c.d', '.', 3), [
    '1',
    '2',
    '3-a.b+c.d',
  ])
  t.strictSame(fastSplit('1.2.3', '.', 3), ['1', '2', '3'])
  t.strictSame(fastSplit('1.2', '.', 3), ['1', '2'])
  t.strictSame(fastSplit('1.', '.', 3), ['1', ''])
  t.strictSame(fastSplit('1', '.', 3), ['1'])
  t.strictSame(fastSplit('1..2', '.', 3), ['1', '', '2'])
  t.strictSame(fastSplit('', '.', 3), [''])
  t.strictSame(fastSplit('a||b||c||d', '||', 3), ['a', 'b', 'c||d'])

  // same results as the generic loop (which runs when onPart is set)
  const cases: [string, string][] = [
    ['a b c', ' '],
    ['abc', ' '],
    ['a ', ' '],
    ['', ' '],
    ['1.2.3-a.b', '.'],
    ['1.2', '.'],
    ['1..', '.'],
    ['a||b||c||d', '||'],
    ['a|b', '||'],
  ]
  for (const [str, delim] of cases) {
    for (const limit of [2, 3]) {
      t.strictSame(
        fastSplit(str, delim, limit),
        fastSplit(str, delim, limit, part => part),
        `${JSON.stringify(str)} by ${JSON.stringify(delim)} limit ${limit}`,
      )
    }
  }
  t.end()
})
