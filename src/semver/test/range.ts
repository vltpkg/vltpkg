import t from 'tap'
import { Range, isRange } from '../src/range.ts'
import { Version } from '../src/version.ts'
import rangeToString from './fixtures/range-tostring.ts'
import { excludes, includes } from './fixtures/ranges.ts'
import { Comparator } from '../src/comparator.ts'

for (const [range, version] of includes) {
  t.equal(
    new Range(range).test(Version.parse(version)),
    true,
    `${range} includes ${version}`,
  )
}
for (const [range, version] of excludes) {
  t.equal(
    new Range(range).test(Version.parse(version)),
    false,
    `${range} excludes ${version}`,
  )
}
for (const [range, ts, pts] of rangeToString) {
  t.test(`toString(${range})`, t => {
    const r = new Range(range)
    t.equal(r.toString(), ts)
    // call again to cover caching
    t.equal(r.toString(), ts)
    t.equal(new Range(range, true).toString(), pts)
    t.end()
  })
}

t.test(
  'if every comparator is invalid, throw the first error',
  async t => {
    t.throws(() => new Range('asfd || foo || bar'))
    t.throws(() => new Range('asfd'))
    t.doesNotThrow(() => new Range('asdf || 1.0.0 || foo'))
  },
)

t.test('isSingle tests', t => {
  t.equal(new Range('1.2.3').isSingle, true)
  t.equal(new Range('>=1.2.3').isSingle, false)
  t.equal(new Range('=1.2.3').isSingle, true)
  t.equal(new Range('1.2.3 || 1.2.4').isSingle, false)
  t.equal(new Range('1.2').isSingle, false)
  // technically only one version can satisfy this, but it's not expressed
  // as a single version, so it doesn't get the special treatment.
  t.equal(new Range('>=1.2.3 <1.2.4').isSingle, false)
  t.equal(new Range('>=1.2.3 <1.2.4 >1.2.0').isSingle, false)
  t.equal(new Range('=1.2.3 <1.2.4 >1.2.0').isSingle, false)
  t.end()
})

t.test('isRange type guard', t => {
  // Valid Range instance
  const validRange = new Range('1.2.3')
  t.equal(
    isRange(validRange),
    true,
    'identifies a valid Range instance',
  )

  // Invalid values
  t.equal(isRange(null), false, 'null is not a Range')
  t.equal(isRange(undefined), false, 'undefined is not a Range')
  t.equal(isRange('1.2.3'), false, 'string is not a Range')
  t.equal(isRange(123), false, 'number is not a Range')
  t.equal(isRange([]), false, 'array is not a Range')
  t.equal(isRange({}), false, 'empty object is not a Range')

  // Object with missing properties
  t.equal(isRange({ raw: '1.2.3' }), false, 'missing set property')

  t.equal(isRange({ set: [] }), false, 'missing raw property')

  // Object with incorrect property types
  t.equal(
    isRange({ raw: 123, set: [] }),
    false,
    'raw property is not a string',
  )

  t.equal(
    isRange({ raw: '1.2.3', set: 'not an array' }),
    false,
    'set property is not an array',
  )

  t.equal(
    isRange({ raw: '1.2.3', set: [{}] }),
    false,
    'set contains non-Comparator elements',
  )

  // An object that looks like a Range but isn't a direct instance
  const comparator = new Comparator('1.2.3')
  t.equal(
    isRange({
      raw: '1.2.3',
      set: [comparator],
    }),
    true,
    'object with all required properties passes the type guard',
  )

  t.end()
})
