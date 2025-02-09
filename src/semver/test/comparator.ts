import t from 'tap'
import { Comparator } from '../src/comparator.ts'

// version tests cover most of the comparator code paths
import { Version } from '../src/version.ts'
import './range.ts'
import './version.ts'

t.test('invalid comparators', t => {
  const invalid = [
    '1.2.3 - 4.5.6 2.3.4 - 5.4.3',
    '1.2.3 -',
    '>=2.3.4 5.3.2 - 6.7.8',
    '5.3.2 - 6.7.8 >=2.3.4',
    '3.4+build',
    '3.4-pre',
    '3.4-pre+build',
    '3.4.x+build',
    '3.4.x-pre',
    '3.4.x-pre+build',
    '3.4.+build',
    '3.4.-pre',
    '3.4.-pre+build',
    '3.x.4',
    '3.x.4+build',
    '3.x.4-pre',
    '3.x.4-pre+build',
    '3..4+build',
    '3..4-pre',
    '3..4-pre+build',
    'x.3.4',
    'x.3.4+build',
    'x.3.4-pre',
    'x.3.4-pre+build',
    '.3.4',
    '.3.4+build',
    '.3.4-pre',
    '.3.4-pre+build',
    '..',
    '.',
    '1.2.3-',
    '1.2.3+',
    '1.2.3-+',
    '1.2.3-x+',
    '1.2.',
    '1.',
    '1..',
    '1 - 2 -',
    '1 - 2 - 3',
    '>',
    '~',
    '~>',
    '>=',
    '<=',
    '<',
    '>',
  ]
  for (const i of invalid) {
    t.throws(() => new Comparator(i), i)
  }
  t.end()
})

t.test('any and none are singletons', t => {
  t.test('any', t => {
    const a = new Comparator('*').tuples[0]
    const apr = new Comparator('*', true).tuples[0]
    t.equal((apr as Comparator).includePrerelease, true)
    for (const a0 of [
      '*',
      '* - *',
      'x',
      '',
      'X',
      'x.*',
      'x.x.x',
      '>=*',
      '<=*',
      '^x',
      '~X',
    ]) {
      const c = new Comparator(a0)
      t.equal(c.test(Version.parse('1.2.3')), true)
      t.equal(c.test(Version.parse('1.2.3-0')), false)
      t.equal(c.tuples[0], a, a0)
      t.equal(c.toString(), '*')
      t.equal(c.tuples[0]?.toString(), '*')
      t.equal(
        (c.tuples[0] as Comparator).test(Version.parse('1.2.3')),
        true,
      )
      t.equal(
        (c.tuples[0] as Comparator).test(Version.parse('1.2.3-0')),
        false,
      )
      const cp = new Comparator(a0, true)
      t.equal(cp.tuples[0], apr, a0 + ' pr')
      t.equal(cp.toString(), '*')
      t.equal(cp.tuples[0]?.toString(), '*')
      t.equal(cp.test(Version.parse('1.2.3')), true)
      t.equal(cp.test(Version.parse('1.2.3-0')), true)
      t.equal(
        (cp.tuples[0] as Comparator).test(Version.parse('1.2.3')),
        true,
      )
      t.equal(
        (cp.tuples[0] as Comparator).test(Version.parse('1.2.3-0')),
        true,
      )
    }
    t.end()
  })

  t.test('nones', t => {
    const none = new Comparator('<0.0.0-0').tuples[0]
    for (const n of [
      '<   0.0.0-0',
      '<  0.0.0-0',
      '< 0.0.0-0',
      '3.x <0.0.0-0 99',
      '<0.0.0-0 99',
      '3.x <0.0.0-0',
    ]) {
      const c = new Comparator(n)
      t.equal(c.tuples[0], none)
      t.equal(c.toString(), '<0.0.0-0')
      t.equal(c.tuples[0]?.toString(), '<0.0.0-0')
      t.equal(c.test(Version.parse('0.0.0-0')), false)
    }
    for (const n of [
      '<   0.0.0-0',
      '<  0.0.0-0',
      '< 0.0.0-0',
      '3.x <0.0.0-0 99',
      '<0.0.0-0 99',
      '3.x <0.0.0-0',
      '>*',
      '>x',
      '<*',
    ]) {
      const c = new Comparator(n, true)
      t.equal(c.tuples[0], none)
      t.equal(c.toString(), '<0.0.0-0')
      t.equal(c.tuples[0]?.toString(), '<0.0.0-0')
      t.equal(c.test(Version.parse('0.0.0')), false)
      t.equal(
        (c.tuples[0] as Comparator).test(Version.parse('0.0.0')),
        false,
      )
    }
    t.end()
  })
  t.end()
})
