#!/usr/bin/env tap -Rtap --disable-coverage --allow-empty-coverage
import semver from 'semver'
import t from 'tap'
import { highest } from '../../src/index.js'
import { Range } from '../../src/range.js'
import { Version } from '../../src/version.js'
import { excludes, includes } from './ranges.js'

const all = [...includes, ...excludes]
const allRanges = [...new Set(all.map(([r]) => r))]
const allVersions = [...new Set(all.map(([_, v]) => v))]

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
  const vltSemVer = () => {
    for (const [_, v] of all) Version.parse(v)
  }

  const nodeSemVer = () => {
    for (const [_, v] of all) new semver.SemVer(v)
  }

  const ns = test(nodeSemVer) * all.length
  const vs = test(vltSemVer) * all.length
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
    for (const [range] of all) {
      new semver.Range(range)
    }
  }

  const rangeVltSemVer = () => {
    for (const [range] of all) {
      new Range(range)
    }
  }

  const ns = test(rangeNodeSemVer) * all.length
  const vs = test(rangeVltSemVer) * all.length
  t.comment('node-semver', ns)
  t.comment('@vltpkg/semver', vs)
  t.comment(vs / ns)
  t.equal(vs > ns, true, 'faster', {
    'node-semver': ns,
    '@vltpkg/semver': vs,
  })
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
