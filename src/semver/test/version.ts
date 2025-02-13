import t from 'tap'
import { Version, Range } from '../src/index.ts'
import increments from './fixtures/increments.ts'
import comparisons from './fixtures/comparisons.ts'
import equality from './fixtures/equality.ts'
import invalidVersions from './fixtures/invalid-versions.ts'
import { includes, excludes } from './fixtures/ranges.ts'

t.test('Version.parse', t => {
  for (const [v] of increments) {
    Version.parse(v)
  }
  for (const [a, b] of comparisons) {
    Version.parse(a)
    Version.parse(b)
  }
  for (const [a, b] of equality) {
    Version.parse(a)
    Version.parse(b)
  }
  for (const [v] of invalidVersions) {
    t.throws(() => Version.parse(v))
  }
  t.end()
})

t.test('comparisons', t => {
  t.plan(comparisons.length)
  for (const [v0, v1] of comparisons) {
    t.test(`${v0} ${v1}`, t => {
      const s0 = Version.parse(v0)
      const s1 = Version.parse(v1)
      t.equal(s0.compare(s1), 1)
      t.equal(s0.rcompare(s1), -1)
      t.equal(s0.greaterThan(s1), true)
      t.equal(s0.greaterThanEqual(s1), true)
      t.equal(s0.equals(s1), false)
      t.equal(s0.compare(s0), 0)
      t.equal(s0.rcompare(s0), 0)
      t.equal(s0.equals(s0), true)
      t.equal(s1.compare(s0), -1)
      t.equal(s1.lessThan(s0), true)
      t.equal(s1.lessThanEqual(s0), true)
      t.equal(s1.greaterThan(s0), false)
      t.equal(s1.greaterThanEqual(s0), false)
      t.equal(s1.compare(s1), 0)
      t.equal(s1.equals(s1), true)
      t.end()
    })
  }
})

t.test('equality', t => {
  t.plan(equality.length)
  for (const [v0, v1] of equality) {
    t.test(`${v0} ${v1}`, t => {
      const s0 = Version.parse(v0)
      const s1 = Version.parse(v1)
      t.equal(s0.compare(s1), 0)
      t.equal(s0.rcompare(s1), 0)
      t.equal(s0.equals(s1), true)
      t.equal(s1.compare(s0), 0)
      t.equal(s1.equals(s0), true)
      t.equal(s0.compare(s0), 0)
      t.equal(s0.rcompare(s0), 0)
      t.equal(s0.equals(s0), true)
      t.equal(s1.compare(s1), 0)
      t.equal(s1.equals(s1), true)
      t.end()
    })
  }
})

t.test('toString equals parsed version', t => {
  t.equal(String(Version.parse('1.2.3')), '1.2.3')
  t.equal(String(Version.parse('  v1.2.3-x.y  ')), '1.2.3-x.y')
  t.equal(String(Version.parse('  v1.2.3+x.y  ')), '1.2.3+x.y')
  t.equal(
    String(Version.parse('  v1.2.3-alpha+x.y  ')),
    '1.2.3-alpha+x.y',
  )
  t.end()
})

t.test('really big numeric prerelease value', t => {
  const r = Version.parse('1.2.3-beta.9007199254740990')
  t.strictSame(r.prerelease, ['beta', 9007199254740990])
  // NB: divergence from node-semver
  // long numeric prerelease ids are allowed, but treated as strings.
  const r2 = Version.parse('1.2.3-beta.9007199254740990000')
  t.strictSame(r2.prerelease, ['beta', '9007199254740990000'])
  t.end()
})

t.test('increment', t => {
  t.plan(increments.length)
  for (const [version, inc, expect, id] of increments) {
    t.test(`${version} ${inc} ${id || ''}`.trim(), t => {
      if (expect === null) {
        t.plan(1)
        t.throws(() => Version.parse(version).inc(inc, id))
      } else {
        t.plan(2)
        const incremented = Version.parse(version).inc(inc, id)
        t.equal(String(incremented), expect)
        if (incremented.build?.length) {
          t.equal(
            incremented.raw,
            `${expect}+${incremented.build.join('.')}`,
          )
        } else {
          t.equal(incremented.raw, expect)
        }
      }
    })
  }
})

t.test('compare main vs pre', t => {
  const s = Version.parse('1.2.3-alpha.0.pr.1')
  t.equal(s.compare(Version.parse('2.3.4')), -1)
  t.equal(s.compare(Version.parse('1.2.4')), -1)
  t.equal(s.compare(Version.parse('0.1.2')), 1)
  t.equal(s.compare(Version.parse('1.2.2')), 1)
  t.equal(s.compare(Version.parse('1.2.3-pre')), -1)
  t.equal(s.compare(Version.parse('9.9.9-alpha.0.pr.1')), -1)
  t.equal(s.compare(Version.parse('1.2.3')), -1)
  t.equal(s.compare(Version.parse('1.2.3-alpha.0.pr.2')), -1)
  t.equal(s.compare(Version.parse('1.2.3-alpha.0.2')), 1)

  t.equal(s.rcompare(Version.parse('2.3.4')), 1)
  t.equal(s.rcompare(Version.parse('1.2.4')), 1)
  t.equal(s.rcompare(Version.parse('0.1.2')), -1)
  t.equal(s.rcompare(Version.parse('1.2.2')), -1)
  t.equal(s.rcompare(Version.parse('1.2.3-pre')), 1)
  t.equal(s.rcompare(Version.parse('9.9.9-alpha.0.pr.1')), 1)
  t.equal(s.rcompare(Version.parse('1.2.3')), 1)
  t.equal(s.rcompare(Version.parse('1.2.3-alpha.0.pr.2')), 1)
  t.equal(s.rcompare(Version.parse('1.2.3-alpha.0.2')), -1)
  t.end()
})

t.test('version.satisfies(range)', t => {
  for (const [range, version] of includes) {
    t.equal(
      Version.parse(version).satisfies(new Range(range)),
      true,
      `'${version}' satisfies '${range}'`,
    )
  }
  for (const [range, version] of excludes) {
    t.equal(
      Version.parse(version).satisfies(new Range(range)),
      false,
      `'${version}' does not satisfy '${range}'`,
    )
  }
  t.end()
})
