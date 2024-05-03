import t from 'tap'
import { Range } from '../src/range.js'
import { Version } from '../src/version.js'
import rangeToString from './fixtures/range-tostring.js'
import { excludes, includes } from './fixtures/ranges.js'

for (const [range, version] of includes) {
  t.equal(new Range(range).test(Version.parse(version)), true)
}
for (const [range, version] of excludes) {
  t.equal(new Range(range).test(Version.parse(version)), false)
}
for (const [range, ts, pts] of rangeToString) {
  t.equal(new Range(range).toString(), ts)
  t.equal(new Range(range, true).toString(), pts)
}
