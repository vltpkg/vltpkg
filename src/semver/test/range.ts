import t from 'tap'
import { Range } from '../src/range.ts'
import { Version } from '../src/version.ts'
import rangeToString from './fixtures/range-tostring.ts'
import { excludes, includes } from './fixtures/ranges.ts'

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
