#!/usr/bin/env -S tap -Rtap --disable-coverage --allow-empty-coverage
import semver from 'semver'
import t from 'tap'
import { highest } from '../../src/index.ts'
import { Range } from '../../src/range.ts'
import { Version } from '../../src/version.ts'
import { excludes, includes } from './ranges.ts'

const raw = [...includes, ...excludes]
const all = raw.filter(([range, version]) => {
  try {
    new Range(range)
    new semver.Range(range)
    Version.parse(version)
    new semver.SemVer(version)
    return true
  } catch {
    return false
  }
})
const allRanges = [...new Set(all.map(([r]) => r))]
const allVersions = [...new Set(all.map(([_, v]) => v))]

t.comment('raw', raw.length)
t.comment('all', all.length)
t.comment('allRanges', allRanges.length)
t.comment('allVersions', allVersions.length)

const test = (fn: () => void, howLong = 1000) => {
  const start = performance.now()
  let ops = 0
  while (performance.now() - start < howLong) {
    fn()
    ops++
  }
  return ops / (performance.now() - start)
}

t.test('version parses per ms', t => {
  const nodeSemVer = () => {
    for (const v of allVersions) new semver.SemVer(v)
  }

  const vltSemVer = () => {
    for (const v of allVersions) Version.parse(v)
  }

  const ns = test(nodeSemVer) * allVersions.length
  const vs = test(vltSemVer) * allVersions.length
  t.comment('node-semver', ns)
  t.comment('@vltpkg/semver', vs)
  t.comment(vs / ns)
  t.equal(vs > ns, true, 'faster', {
    'node-semver': ns,
    '@vltpkg/semver': vs,
  })
  t.end()
})

t.test('range parses per ms', t => {
  const rangeNodeSemVer = () => {
    for (const range of allRanges) {
      new semver.Range(range)
    }
  }

  const rangeVltSemVer = () => {
    for (const range of allRanges) {
      new Range(range)
    }
  }

  const ns = test(rangeNodeSemVer) * allRanges.length
  const vs = test(rangeVltSemVer) * allRanges.length
  t.comment('node-semver', ns)
  t.comment('@vltpkg/semver', vs)
  t.comment(vs / ns)
  t.equal(
    vs / ns > 0.7,
    true,
    'similar speeds for just range parse',
    {
      'node-semver': ns,
      '@vltpkg/semver': vs,
    },
  )
  t.end()
})

t.test('range tests per ms', t => {
  const satisfiesNodeSemVer = () => {
    for (const [range, version] of all) {
      const r = new semver.Range(range)
      const v = new semver.SemVer(version)
      r.test(v)
    }
  }

  const satisfiesVltSemVer = () => {
    for (const [range, version] of all) {
      const r = new Range(range)
      const v = Version.parse(version)
      r.test(v)
    }
  }

  const ns = test(satisfiesNodeSemVer) * all.length
  const vs = test(satisfiesVltSemVer) * all.length
  t.comment('node-semver', ns)
  t.comment('@vltpkg/semver', vs)
  t.comment(vs / ns)
  t.equal(vs > ns, true, 'faster', {
    'node-semver': ns,
    '@vltpkg/semver': vs,
  })
  t.end()
})

t.test(`highest per ms (with ${allVersions.length} versions)`, t => {
  const highestNodeSemVer = () => {
    for (const range of allRanges) {
      semver.maxSatisfying(allVersions, range)
    }
  }
  const highestVltSemVer = () => {
    for (const range of allRanges) {
      highest(allVersions, range)
    }
  }
  const ns = test(highestNodeSemVer) * allRanges.length
  const vs = test(highestVltSemVer) * allRanges.length
  t.comment('node-semver', ns)
  t.comment('@vltpkg/semver', vs)
  t.comment(vs / ns)
  t.equal(vs > ns, true, 'faster', {
    'node-semver': ns,
    '@vltpkg/semver': vs,
  })
  t.end()
})
