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
