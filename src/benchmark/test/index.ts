import t from 'tap'
import * as B from '../src/index.js'
import timers from 'timers/promises'

t.equal(B.packages.length, 1000)
t.equal(B.randomize(B.packages).length, 1000)
t.equal(B.randomPackages().length, 1000)
t.equal(B.randomPackages(10).length, 10)

t.strictSame(B.convertNs(1_000_000_000), [1, B.UNIT.s])
t.strictSame(B.convertNs(1_000_000), [1, B.UNIT.ms])
t.strictSame(B.convertNs(1_000), [1, B.UNIT.us])
t.strictSame(B.convertNs(1), [1, B.UNIT.ns])
t.strictSame(B.convertNs(1_000_000_000, B.UNIT.ns), [
  1_000_000_000,
  B.UNIT.ns,
])

t.equal(B.numToFixed(1), '1.00')
t.equal(B.numToFixed(1, { decimals: 1 }), '1.0')
t.equal(B.numToFixed(1, { padStart: 2 }), ' 1.00')

t.match(
  B.runFor(i => {
    if (i === 1) {
      throw new Error('xxx')
    }
  }, 100),
  {
    elapsed: Number,
    errors: 1,
    iterations: Number,
    per: Number,
  },
)

t.resolveMatch(
  B.timePromises([1, 2, 3], async i => {
    if (i === 3) {
      throw new Error('xxx')
    }
    await timers.setTimeout(i)
  }),
  {
    time: Number,
    errors: 1,
  },
)
