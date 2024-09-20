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
