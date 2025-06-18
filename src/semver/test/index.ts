import t from 'tap'
import {
  build,
  compare,
  eq,
  filter,
  gt,
  gte,
  highest,
  inc,
  intersects,
  lowest,
  lt,
  lte,
  major,
  minor,
  neq,
  parse,
  parseRange,
  patch,
  prerelease,
  Range,
  rcompare,
  rsort,
  rsortedHighest,
  rsortedLowest,
  rsortMethod,
  satisfies,
  sort,
  sortedHighest,
  sortedLowest,
  sortMethod,
  stable,
  valid,
  validRange,
  Version,
} from '../src/index.ts'
import increments from './fixtures/increments.ts'
import { excludes, includes } from './fixtures/ranges.ts'

t.test('parse, valid', t => {
  const v = Version.parse('1.2.3')
  t.strictSame(parse('1.2.3'), v)
  t.equal(parse(v), v)
  t.equal(valid('1.2.3'), true)
  t.equal(parse('adsfhasoe'), undefined)
  t.equal(valid('adsfhasoe'), false)

  //@ts-expect-error
  t.strictSame(parse({ toString: () => '1.2.3' }), v)
  //@ts-expect-error
  t.equal(valid({ toString: () => '1.2.3' }), true)
  t.end()
})

t.test('parseRange, validRange', t => {
  const r = new Range('>=1.3')
  const rp = new Range('>=1.3', true)
  t.strictSame(parseRange('>=1.3'), r)
  t.strictSame(parseRange('>=1.3', true), rp)
  t.equal(parseRange(r), r)
  t.equal(parseRange(rp, true), rp)
  t.strictSame(parseRange(r, true), rp)
  t.strictSame(parseRange(rp), r)
  t.equal(validRange('>=1.3'), true)
  t.strictSame(parseRange('>='), undefined)
  t.equal(validRange('>='), false)
  t.end()
})

t.test('satisfies', t => {
  for (const [range, version] of includes) {
    const v = Version.parse(version)
    const r = new Range(range)
    t.equal(satisfies(version, range), true)
    t.equal(satisfies(version, range, true), true)
    t.equal(satisfies(v, range), true)
    t.equal(satisfies(v, range, true), true)
    t.equal(satisfies(version, r), true)
    t.equal(satisfies(version, r, true), true)
    t.equal(satisfies(v, r), true)
    t.equal(satisfies(v, r, true), true)
  }
  for (const [range, version] of excludes) {
    const v = Version.parse(version)
    const r = new Range(range)
    t.equal(satisfies(version, range), false)
    t.equal(satisfies(v, range), false)
    t.equal(satisfies(version, r), false)
    t.equal(satisfies(v, r), false)
  }
  t.equal(satisfies('invalid version', '*'), false)
  t.equal(satisfies('1.2.3', 'invalid range'), false)
  t.equal(satisfies('1.2.3-x', '1'), false)
  t.equal(satisfies('1.2.3-x', '1', true), true)
  t.end()
})

t.test('inc', t => {
  t.plan(increments.length)
  for (const [version, incType, expect, id] of increments) {
    t.test(`${version} ${incType} ${id || ''}`.trim(), t => {
      if (expect === null) {
        t.throws(() => inc(version, incType, id))
        t.throws(() => inc(Version.parse(version), incType, id))
      } else {
        const incremented = inc(version, incType, id)
        const incrementedObj = inc(
          Version.parse(version),
          incType,
          id,
        )
        t.equal(String(incremented), expect)
        t.equal(String(incrementedObj), expect)
        if (incremented.build?.length) {
          t.equal(
            incremented.raw,
            `${expect}+${incremented.build.join('.')}`,
          )
        } else {
          t.equal(incremented.raw, expect)
        }
      }
      t.end()
    })
  }
  t.end()
})

t.test('sorting and filtering', t => {
  const list = [
    '1.2.3',
    'foo',
    '0.3.12',
    '6.5.4',
    'apple',
    '2.3.5-dev',
    '2.3.5',
    'zobblekr',
  ]
  t.strictSame(
    sort(list),
    [
      '0.3.12',
      '1.2.3',
      '2.3.5-dev',
      '2.3.5',
      '6.5.4',
      'apple',
      'foo',
      'zobblekr',
    ],
    'sort list',
  )
  t.strictSame(rsort(list), [
    '6.5.4',
    '2.3.5',
    '2.3.5-dev',
    '1.2.3',
    '0.3.12',
    'apple',
    'foo',
    'zobblekr',
  ])
  t.strictSame(filter(list, '*'), [
    '1.2.3',
    '0.3.12',
    '6.5.4',
    '2.3.5',
  ])
  t.strictSame(filter(list, '*', true), [
    '1.2.3',
    '0.3.12',
    '6.5.4',
    '2.3.5-dev',
    '2.3.5',
  ])
  t.strictSame(filter(list, 'invalid range'), [])
  t.end()
})

t.test('highest', t => {
  const list = [
    '1.2.3',
    'foo',
    '0.3.12',
    '6.5.4',
    'apple',
    '2.3.5-dev',
    '2.3.4',
    'zobblekr',
  ]
  t.equal(String(highest(list, '<5.0.0')), '2.3.4')
  t.equal(String(highest(list, '<5.0.0', true)), '2.3.5-dev')
  t.equal(highest(list, 'invalid version'), undefined)
  t.equal(highest(list, '>9999'), undefined)
  t.equal(highest(list, '>9999', true), undefined)
  list.sort(sortMethod)
  t.equal(String(sortedHighest(list, '<5.0.0')), '2.3.4')
  t.equal(String(sortedHighest(list, '<5.0.0', true)), '2.3.5-dev')
  t.equal(sortedHighest(list, 'invalid version'), undefined)
  t.equal(sortedHighest(list, '>9999'), undefined)
  t.equal(sortedHighest(list, '>9999', true), undefined)
  list.sort(rsortMethod)
  t.equal(String(rsortedHighest(list, '<5.0.0')), '2.3.4')
  t.equal(String(rsortedHighest(list, '<5.0.0', true)), '2.3.5-dev')
  t.equal(rsortedHighest(list, 'invalid version'), undefined)
  t.equal(rsortedHighest(list, '>9999'), undefined)
  t.equal(rsortedHighest(list, '>9999', true), undefined)
  t.end()
})

t.test('lowest', t => {
  const list = [
    '1.2.3',
    'foo',
    '0.3.12',
    '6.5.4',
    'apple',
    '2.3.5-dev',
    '2.3.5',
    'zobblekr',
  ]
  t.equal(String(lowest(list, '>2.0.0')), '2.3.5')
  t.equal(String(lowest(list, '>2.0.0', true)), '2.3.5-dev')
  t.equal(lowest(list, 'invalid version'), undefined)
  t.equal(lowest(list, '>9999'), undefined)
  t.equal(lowest(list, '>9999', true), undefined)
  list.sort(sortMethod)
  t.equal(String(sortedLowest(list, '>2.0.0')), '2.3.5')
  t.equal(String(sortedLowest(list, '>2.0.0', true)), '2.3.5-dev')
  t.equal(sortedLowest(list, 'invalid version'), undefined)
  t.equal(sortedLowest(list, '>9999'), undefined)
  t.equal(sortedLowest(list, '>9999', true), undefined)
  list.sort(rsortMethod)
  t.equal(String(rsortedLowest(list, '>2.0.0')), '2.3.5')
  t.equal(String(rsortedLowest(list, '>2.0.0', true)), '2.3.5-dev')
  t.equal(rsortedLowest(list, 'invalid version'), undefined)
  t.equal(rsortedLowest(list, '>9999'), undefined)
  t.equal(rsortedLowest(list, '>9999', true), undefined)
  t.end()
})

t.test('compare', t => {
  t.equal(compare('v1.2.3', '1.2.3'), 0)
  t.equal(rcompare('v1.2.3', '1.2.3'), 0)
  t.equal(gt('v1.2.3', '1.2.3'), false)
  t.equal(gte('v1.2.3', '1.2.3'), true)
  t.equal(lt('v1.2.3', '1.2.3'), false)
  t.equal(lte('v1.2.3', '1.2.3'), true)
  t.equal(eq('v1.2.3', '1.2.3'), true)
  t.equal(neq('v1.2.3', '1.2.3'), false)

  t.equal(compare('v2.2.3', '1.2.3'), 1)
  t.equal(rcompare('v2.2.3', '1.2.3'), -1)
  t.equal(gt('v2.2.3', '1.2.3'), true)
  t.equal(gte('v2.2.3', '1.2.3'), true)
  t.equal(lt('v2.2.3', '1.2.3'), false)
  t.equal(lte('v2.2.3', '1.2.3'), false)
  t.equal(eq('v2.2.3', '1.2.3'), false)
  t.equal(neq('v2.2.3', '1.2.3'), true)

  t.equal(compare('v0.2.3', '1.2.3'), -1)
  t.equal(rcompare('v0.2.3', '1.2.3'), 1)
  t.equal(gt('v0.2.3', '1.2.3'), false)
  t.equal(gte('v0.2.3', '1.2.3'), false)
  t.equal(lt('v0.2.3', '1.2.3'), true)
  t.equal(lte('v0.2.3', '1.2.3'), true)
  t.equal(eq('v0.2.3', '1.2.3'), false)
  t.equal(neq('v0.2.3', '1.2.3'), true)

  t.throws(() => compare('apple', 'banana'))
  t.throws(() => rcompare('apple', 'banana'))
  t.throws(() => compare('1.2.3', 'banana'))
  t.throws(() => rcompare('1.2.3', 'banana'))
  t.throws(() => gt('apple', 'banana'))
  t.throws(() => gt('1.2.3', 'banana'))
  t.throws(() => gte('apple', 'banana'))
  t.throws(() => gte('1.2.3', 'banana'))
  t.throws(() => lt('apple', 'banana'))
  t.throws(() => lt('1.2.3', 'banana'))
  t.throws(() => lte('apple', 'banana'))
  t.throws(() => lte('1.2.3', 'banana'))
  t.end()
})

t.test('extracting fields', t => {
  t.equal(major('1.2.3-a.1+b.2'), 1)
  t.equal(minor('1.2.3-a.1+b.2'), 2)
  t.equal(patch('1.2.3-a.1+b.2'), 3)
  t.strictSame(prerelease('1.2.3-a.1+b.2'), ['a', 1])
  t.strictSame(prerelease('1.2.3+b.2'), [])
  t.strictSame(build('1.2.3-a.1+b.2'), ['b', '2'])
  t.strictSame(build('1.2.3-a.1'), [])

  t.equal(major('asdf'), undefined)
  t.equal(minor('asdf'), undefined)
  t.equal(patch('asdf'), undefined)
  t.equal(prerelease('asdf'), undefined)
  t.equal(build('asdf'), undefined)
  t.end()
})

t.test('stable filter', t => {
  const versions = ['1.2.3-foo', '2.3.4', 'asdf']
  t.strictSame(stable(versions), ['2.3.4'])
  t.end()
})

t.test('intersects', t => {
  const cases: [string, string, boolean, boolean?][] = [
    // Basic intersection cases
    ['1.2.3', '1.2.3', true],
    ['1.2.3', '1.2.4', false],

    // Range intersections
    ['^1.2.3', '^1.2.4', true], // Both allow 1.2.4 and above
    ['^1.2.3', '^2.0.0', false], // No overlap
    ['~1.2.3', '~1.2.4', true], // ~1.2.3 allows >=1.2.3 <1.3.0, ~1.2.4 allows >=1.2.4 <1.3.0, overlap from 1.2.4 to 1.3.0
    ['~1.2', '~1.2.3', true], // ~1.2 allows 1.2.x, ~1.2.3 allows 1.2.x

    // Greater than / less than
    ['>1.2.3', '<2.0.0', true], // Overlap in between
    ['>2.0.0', '<1.0.0', false], // No overlap
    ['>=1.2.3', '<=1.2.3', true], // Exact match at boundary
    ['>1.2.3', '<=1.2.3', false], // No overlap at boundary

    // Complex ranges
    ['>=1.2.3 <2.0.0', '>=1.5.0 <3.0.0', true], // Overlap from 1.5.0 to 2.0.0
    ['>=1.2.3 <1.5.0', '>=1.5.0 <2.0.0', false], // No overlap
    ['>=1.2.3 <1.5.1', '>=1.5.0 <2.0.0', true], // Overlap from 1.5.0 to 1.5.1

    // OR ranges
    ['1.2.3 || 2.0.0', '1.2.3', true], // First part matches
    ['1.2.3 || 2.0.0', '2.0.0', true], // Second part matches
    ['1.2.3 || 2.0.0', '1.5.0', false], // No match
    ['1.2.3 || 2.0.0', '^1.2.0', true], // ^1.2.0 includes 1.2.3

    // Any range
    ['*', '1.2.3', true],
    ['1.2.3', '*', true],
    ['*', '*', true],

    // X-ranges
    ['1.2.x', '1.2.3', true],
    ['1.2.x', '1.3.0', false],
    ['1.x', '1.2.3', true],
    ['1.x', '2.0.0', false],

    // Prerelease versions
    ['1.2.3-alpha', '1.2.3-alpha', true],
    ['1.2.3-alpha', '1.2.3-beta', false],
    ['^1.2.3-alpha', '1.2.3-alpha.1', true, true], // With prerelease flag
    ['^1.2.3-alpha', '1.2.3-alpha.1', true, false], // Without prerelease flag - should still intersect as both have prereleases
  ]

  for (const [r1, r2, expected, includePrerelease] of cases) {
    t.equal(
      intersects(r1, r2, includePrerelease),
      expected,
      `intersects(${r1}, ${r2}${includePrerelease !== undefined ? `, ${includePrerelease}` : ''}) = ${expected}`,
    )

    // Test symmetry: intersects(a, b) === intersects(b, a)
    t.equal(
      intersects(r2, r1, includePrerelease),
      expected,
      `intersects(${r2}, ${r1}${includePrerelease !== undefined ? `, ${includePrerelease}` : ''}) = ${expected} (symmetric)`,
    )
  }

  // Test with Range objects directly
  t.test('with Range objects', t => {
    const range1 = parseRange('^1.2.3')
    const range2 = parseRange('^1.2.4')
    t.ok(range1, 'parsed range1')
    t.ok(range2, 'parsed range2')
    if (range1 && range2) {
      t.equal(
        intersects(range1, range2),
        true,
        'Range objects intersect',
      )
    }
    t.end()
  })

  // Test invalid ranges
  t.test('invalid ranges', t => {
    t.equal(
      intersects('invalid', '1.2.3'),
      false,
      'invalid r1 returns false',
    )
    t.equal(
      intersects('1.2.3', 'invalid'),
      false,
      'invalid r2 returns false',
    )
    t.equal(
      intersects('invalid', 'alsoinvalid'),
      false,
      'both invalid returns false',
    )
    t.end()
  })

  // Test edge cases for better coverage
  t.test('edge cases', t => {
    // Test exact version conflicts
    t.equal(
      intersects('=1.2.3', '=1.2.4'),
      false,
      'different exact versions do not intersect',
    )
    t.equal(
      intersects('=1.2.3', '=1.2.3'),
      true,
      'same exact versions intersect',
    )

    // Test bounds edge cases
    t.equal(
      intersects('>=1.2.3', '<1.2.3'),
      false,
      'no overlap between >= and <',
    )
    t.equal(
      intersects('>1.2.3', '<=1.2.3'),
      false,
      'no overlap between > and <=',
    )
    t.equal(
      intersects('>=1.2.3', '<=1.2.2'),
      false,
      'lower bound greater than upper bound',
    )

    // Test with exact version within bounds
    t.equal(
      intersects('>=1.2.0 <=1.2.5', '=1.2.3'),
      true,
      'exact version within bounds',
    )
    t.equal(
      intersects('>=1.2.0 <1.2.3', '=1.2.3'),
      false,
      'exact version at exclusive upper bound',
    )
    t.equal(
      intersects('>1.2.3 <=1.2.5', '=1.2.3'),
      false,
      'exact version at exclusive lower bound',
    )

    // Test more exact version edge cases for better coverage
    t.equal(
      intersects('=1.2.3', '>=1.2.4'),
      false,
      'exact version below lower bound',
    )
    t.equal(
      intersects('=1.2.5', '<=1.2.4'),
      false,
      'exact version above upper bound',
    )

    // Test specific edge cases to hit uncovered lines
    t.equal(
      intersects('=1.2.3', '>1.2.3'),
      false,
      'exact version at exclusive lower bound',
    )
    t.equal(
      intersects('=1.2.3', '<1.2.3'),
      false,
      'exact version at exclusive upper bound',
    )

    // Test cases based on node-semver fixtures to improve coverage
    t.equal(
      intersects('1.3.0', '>=1.3.0'),
      true,
      'Version matches lower bound',
    )
    t.equal(
      intersects('1.3.0', '>1.3.0'),
      false,
      'Version at exclusive lower bound',
    )
    t.equal(
      intersects('>=1.3.0', '1.3.0'),
      true,
      'Lower bound matches version',
    )
    t.equal(
      intersects('>1.3.0', '1.3.0'),
      false,
      'Exclusive lower bound vs version',
    )

    // Same direction increasing
    t.equal(
      intersects('>1.3.0', '>1.2.0'),
      true,
      'Same direction increasing',
    )
    t.equal(
      intersects('>1.2.0', '>1.3.0'),
      true,
      'Same direction increasing reversed',
    )
    t.equal(
      intersects('>=1.2.0', '>1.3.0'),
      true,
      'Mixed inclusive/exclusive increasing',
    )
    t.equal(
      intersects('>1.2.0', '>=1.3.0'),
      true,
      'Mixed exclusive/inclusive increasing',
    )

    // Same direction decreasing
    t.equal(
      intersects('<1.3.0', '<1.2.0'),
      true,
      'Same direction decreasing',
    )
    t.equal(
      intersects('<1.2.0', '<1.3.0'),
      true,
      'Same direction decreasing reversed',
    )
    t.equal(
      intersects('<=1.2.0', '<1.3.0'),
      true,
      'Mixed inclusive/exclusive decreasing',
    )
    t.equal(
      intersects('<1.2.0', '<=1.3.0'),
      true,
      'Mixed exclusive/inclusive decreasing',
    )

    // Different directions, same semver and inclusive operator
    t.equal(
      intersects('>=1.3.0', '<=1.3.0'),
      true,
      'Inclusive bounds at same version',
    )
    t.equal(
      intersects('>=1.3.0', '>=1.3.0'),
      true,
      'Same lower bounds',
    )
    t.equal(
      intersects('<=1.3.0', '<=1.3.0'),
      true,
      'Same upper bounds',
    )
    t.equal(
      intersects('>1.3.0', '<=1.3.0'),
      false,
      'Exclusive lower vs inclusive upper at same version',
    )
    t.equal(
      intersects('>=1.3.0', '<1.3.0'),
      false,
      'Inclusive lower vs exclusive upper at same version',
    )

    // Opposite matching directions
    t.equal(
      intersects('>1.0.0', '<2.0.0'),
      true,
      'Opposite bounds with gap',
    )
    t.equal(
      intersects('>=1.0.0', '<2.0.0'),
      true,
      'Inclusive lower, exclusive upper with gap',
    )
    t.equal(
      intersects('>=1.0.0', '<=2.0.0'),
      true,
      'Both inclusive with gap',
    )
    t.equal(
      intersects('>1.0.0', '<=2.0.0'),
      true,
      'Exclusive lower, inclusive upper with gap',
    )
    t.equal(
      intersects('<=2.0.0', '>1.0.0'),
      true,
      'Reversed opposite bounds',
    )
    t.equal(
      intersects('<=1.0.0', '>=2.0.0'),
      false,
      'No overlap between bounds',
    )

    // Empty range tests
    t.equal(intersects('', ''), true, 'Both empty ranges')
    t.equal(
      intersects('', '>1.0.0'),
      true,
      'Empty range with constraint',
    )
    t.equal(
      intersects('<=2.0.0', ''),
      true,
      'Constraint with empty range',
    )

    // Edge cases with very low versions
    t.equal(
      intersects('<0.0.0', '<0.1.0'),
      true,
      'Both less than - they intersect since <0.0.0 is subset of <0.1.0',
    )
    t.equal(
      intersects('<0.1.0', '<0.0.0'),
      true,
      'Both less than - they intersect since <0.0.0 is subset of <0.1.0',
    )

    // Boundary conditions that might trigger special logic
    t.equal(
      intersects('>=1.2.3', '<=1.2.3'),
      true,
      'Inclusive bounds at same version',
    )
    t.equal(
      intersects('>=1.2.3', '<1.2.4'),
      true,
      'Lower bound with tight upper bound',
    )
    t.equal(
      intersects('>1.2.2', '<=1.2.3'),
      true,
      'Exclusive lower with inclusive upper',
    )

    // Test intersecting with multiple exact versions in OR ranges
    t.equal(
      intersects('1.2.3 || 1.2.4', '1.2.3 || 1.2.5'),
      true,
      'OR ranges with common version',
    )
    t.equal(
      intersects('1.2.3 || 1.2.4', '1.2.5 || 1.2.6'),
      false,
      'OR ranges with no common versions',
    )

    t.end()
  })

  // Test comparator-specific edge cases
  t.test('comparator edge cases', t => {
    // Test cases where comparators have no tuples (which shouldn't happen but let's be safe)
    t.equal(intersects('*', '*'), true, 'Both any ranges')

    // Test ranges that result in empty comparator sets
    t.equal(
      intersects('>=1.0.0 <1.0.0', '1.0.0'),
      false,
      'Impossible range vs version',
    )
    t.equal(
      intersects('>1.0.0 <1.0.0', '>=1.0.0'),
      false,
      'Impossible range vs constraint',
    )

    // Test with bounds that are equal but different inclusivity
    t.equal(
      intersects('>=1.2.3', '<=1.2.3'),
      true,
      'Equal bounds, both inclusive',
    )
    t.equal(
      intersects('>1.2.3', '<1.2.3'),
      false,
      'Equal bounds, both exclusive',
    )
    t.equal(
      intersects('>=1.2.3', '<1.2.3'),
      false,
      'Equal bounds, mixed inclusivity',
    )
    t.equal(
      intersects('>1.2.3', '<=1.2.3'),
      false,
      'Equal bounds, mixed inclusivity reversed',
    )

    // Test specific branches that might not be covered
    t.equal(
      intersects('', '1.0.0'),
      true,
      'Empty range vs version (should hit no tuples branch)',
    )
    t.equal(
      intersects('1.0.0', ''),
      true,
      'Version vs empty range (should hit no tuples branch)',
    )

    t.equal(intersects('>=1.2.3', '>=1.2.3'), true, 'Same >= bounds')
    t.equal(
      intersects('>=1.2.3', '>=1.2.2'),
      true,
      'Different >= bounds, first higher',
    )
    t.equal(
      intersects('>=1.2.2', '>=1.2.3'),
      true,
      'Different >= bounds, second higher',
    )
    t.equal(
      intersects('>=1.2.3', '>1.2.2'),
      true,
      '>= vs > with same effective bound',
    )
    t.equal(
      intersects('>1.2.2', '>=1.2.3'),
      true,
      '> vs >= with same effective bound',
    )

    t.equal(
      intersects('<=1.2.3', '<=1.2.4'),
      true,
      '<= bounds, first lower',
    )
    t.equal(
      intersects('<=1.2.4', '<=1.2.3'),
      true,
      '<= bounds, second lower',
    )
    t.equal(intersects('<=1.2.3', '<1.2.4'), true, '<= vs < bounds')
    t.equal(intersects('<1.2.4', '<=1.2.3'), true, '< vs <= bounds')

    // Additional edge cases for satisfiableRange function
    t.equal(
      intersects('>=1.2.3 <=1.2.3', '>=1.2.3 <=1.2.3'),
      true,
      'Identical exact ranges',
    )
    t.equal(
      intersects('>=1.2.3 <=1.2.2', '1.2.3'),
      false,
      'Invalid range (lower > upper) vs version',
    )
    t.equal(
      intersects('>1.2.3 <1.2.3', '1.2.3'),
      false,
      'Invalid range (exclusive bounds equal) vs version',
    )

    // Cases with multiple constraints to hit different paths
    t.equal(
      intersects('>=1.0.0 <=2.0.0', '>=1.5.0 <=1.8.0'),
      true,
      'Overlapping constrained ranges',
    )
    t.equal(
      intersects('>=1.0.0 <1.5.0', '>=1.5.0 <=2.0.0'),
      false,
      'Adjacent non-overlapping ranges',
    )
    t.equal(
      intersects('>1.0.0 <=1.5.0', '>=1.5.0 <2.0.0'),
      true,
      'Adjacent ranges with inclusive boundary',
    )

    // Try with complex ranges that might create empty tuple scenarios
    t.equal(
      intersects('>=1.0.0 <1.0.0 || >=2.0.0', '1.5.0'),
      false,
      'Complex range with impossible first part',
    )
    t.equal(
      intersects('>=1.0.0 <1.0.0', '2.0.0'),
      false,
      'Impossible range vs version',
    )

    // Try edge cases with prerelease versions that might trigger different code paths
    t.equal(
      intersects('>=1.0.0-alpha <=1.0.0-beta', '1.0.0-alpha.1', true),
      true,
      'Prerelease bounds with prerelease version',
    )
    t.equal(
      intersects('>=1.0.0-alpha <1.0.0-alpha', '1.0.0-alpha', true),
      false,
      'Impossible prerelease range',
    )

    t.end()
  })

  t.end()
})
