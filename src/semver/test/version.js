import { test } from 'tap'
import { Version } from '../index.js'
import increments from './fixtures/increments.js'
import comparisons from './fixtures/comparisons.js'
import equality from './fixtures/equality.js'
import invalidVersions from './fixtures/invalid-versions.js'

const inc = (version, release, options, identifier, identifierBase) => {
  if (typeof (options) === 'string') {
    identifierBase = identifier
    identifier = options
    options = undefined
  }
  try {
    return new Version(
      version instanceof Version ? version.version : version,
      options
    ).inc(release, identifier, identifierBase).version
  } catch (er) {
    return null
  }
}
const parse = (v) => new Version(v)

test('comparisons', t => {
  t.plan(comparisons.length)
  comparisons.forEach(([v0, v1]) => t.test(`${v0} ${v1}`, t => {
    const s0 = new Version(v0)
    const s1 = new Version(v1)
    t.equal(s0.compare(s1), 1)
    t.equal(s0.compare(v1), 1)
    t.equal(s1.compare(s0), -1)
    t.equal(s1.compare(v0), -1)
    t.equal(s0.compare(v0), 0)
    t.equal(s1.compare(v1), 0)
    t.end()
  }))
})

test('equality', t => {
  t.plan(equality.length)
  equality.forEach(([v0, v1]) => t.test(`${v0} ${v1}`, t => {
    const s0 = new Version(v0)
    const s1 = new Version(v1)
    t.equal(s0.compare(s1), 0)
    t.equal(s1.compare(s0), 0)
    t.equal(s0.compare(v1), 0)
    t.equal(s1.compare(v0), 0)
    t.equal(s0.compare(s0), 0)
    t.equal(s1.compare(s1), 0)
    t.end()
  }))
})

test('toString equals parsed version', t => {
  t.equal(String(new Version('1.2.3')), '1.2.3')
  t.end()
})

test('throws when presented with garbage', t => {
  t.plan(invalidVersions.length)
  invalidVersions.forEach(([v, msg]) =>
    t.throws(() => new Version(v), msg))
})

test('really big numeric prerelease value', (t) => {
  const r = new Version('1.2.3-beta.9007199254740990')
  t.same(r.prerelease, ['beta', '9007199254740990'])
  t.end()
})

test('throws on too big numeric prerelease value', (t) => {
  t.plan(1)
  t.throws(() => new Version(`1.2.3-beta.${Number.MAX_SAFE_INTEGER}0`))
})

test('invalid version numbers', (t) => {
  ['1.2.3.4', 'NOT VALID', 1.2, null, 'Infinity.NaN.Infinity'].forEach((v) => {
    t.throws(() => new Version(v))
  })
  t.end()
})

test('incrementing', t => {
  t.plan(increments.length)
  increments.forEach(([
    version,
    inc,
    expect,
    id,
    base
  ]) => t.test(`${version} ${inc} ${id || ''}`.trim(), t => {
    if (expect === null) {
      t.plan(1)
      t.throws(() => new Version(version).inc(inc, id, base))
    } else {
      t.plan(2)
      const incremented = new Version(version).inc(inc, id, base)
      t.equal(incremented.version, expect)
      if (incremented.build.length) {
        t.equal(incremented.raw, `${expect}+${incremented.build.join('.')}`)
      } else {
        t.equal(incremented.raw, expect)
      }
    }
  }))
})

test('increment versions test', (t) => {
  increments.forEach(([pre, what, wanted, id, base]) => {
    console.log({ pre, what, wanted, id, base })
    const found = inc(pre, what, id, base)
    const cmd = `inc(${pre}, ${what}, ${id}, ${base})`
    t.equal(found, wanted, `${cmd} === ${wanted}`)

    const parsed = parse(pre)
    const parsedAsInput = parse(pre)
    if (wanted) {
      parsed.inc(what, id, base)
      t.equal(parsed.version, wanted, `${cmd} object version updated`)
      if (parsed.build.length) {
        t.equal(
          parsed.raw,
          `${wanted}+${parsed.build.join('.')}`,
          `${cmd} object raw field updated with build`
        )
      } else {
        t.equal(parsed.raw, wanted, `${cmd} object raw field updated`)
      }

      const preIncObject = JSON.stringify(parsedAsInput)
      inc(parsedAsInput, what, id, base)
      const postIncObject = JSON.stringify(parsedAsInput)
      t.equal(
        postIncObject,
        preIncObject,
        `${cmd} didn't modify its input`
      )
    } else if (parsed) {
      t.throws(() => {
        parsed.inc(what, id, base)
      })
    } else {
      t.equal(parsed, null)
    }
  })

  t.end()
})

test('compare main vs pre', (t) => {
  const s = new Version('1.2.3-alpha.0.pr.1')
  t.equal(s.compare('2.3.4'), -1)
  t.equal(s.compare('1.2.4'), -1)
  t.equal(s.compare('0.1.2'), 1)
  t.equal(s.compare('1.2.2'), 1)
  t.equal(s.compare('1.2.3-pre'), -1)
  t.equal(s.compare('9.9.9-alpha.0.pr.1'), -1)
  t.equal(s.compare('1.2.3'), -1)
  t.equal(s.compare('1.2.3-alpha.0.pr.2'), -1)
  t.equal(s.compare('1.2.3-alpha.0.2'), 1)
  t.end()
})

test('compare build', (t) => {
  const noBuild = new Version('1.0.0')
  const build0 = new Version('1.0.0+0')
  const build1 = new Version('1.0.0+1')
  const build10 = new Version('1.0.0+1.0')
  t.equal(noBuild.compare(build0), 1)
  t.equal(build0.compare(build0), 0)
  t.equal(build0.compare(noBuild), -1)
  t.equal(build0.compare('1.0.0+0.0'), -1)
  t.equal(build0.compare(build1), -1)
  t.equal(build1.compare(build0), 1)
  t.equal(build10.compare(build1), 1)
  t.end()
})
