import type {
  Bugs,
  ConditionalValueObject,
  Dist,
  ExportsSubpaths,
  Imports,
  Integrity,
  JSONField,
  KeyID,
  Manifest,
  ManifestRegistry,
  Packument,
  PeerDependenciesMetaValue,
  Person,
  Repository,
} from '../src/index.ts'
import {
  asError,
  asIntegrity,
  asKeyID,
  asManifest,
  asManifestRegistry,
  asPackument,
  assertIntegrity,
  assertKeyID,
  assertManifest,
  assertManifestRegistry,
  assertPackument,
  assertRecordStringString,
  assertRecordStringT,
  dependencyTypes,
  isErrorWithCause,
  isIntegrity,
  isKeyID,
  isManifest,
  isManifestRegistry,
  isObject,
  isPackument,
  isRecordStringString,
  isRecordStringT,
  longDependencyTypes,
  normalizeFunding,
  normalizeManifest,
} from '../src/index.ts'

import t from 'tap'

t.test('manifest', t => {
  t.equal(isManifest(true), false)
  t.equal(isManifest({ name: true }), false)
  t.equal(isManifest({ name: 'x' }), true)
  t.equal(isManifest({ name: 'x', version: null }), false)
  t.equal(isManifest({ name: 'x', version: 'y' }), true)
  t.equal(isManifest({ name: 'x', version: 420 }), false)
  const om: Record<any, unknown> = { name: 'x', version: '123' }
  // this is fine, type-detected
  const mok: Manifest = asManifest(om)
  mok
  t.throws(() => asManifestRegistry(om))
  const rom = { ...om, type: 'commonjs', dist: { tarball: 'x' } }
  t.equal(asManifestRegistry(rom), rom)
  t.throws(() => asManifest({ name: true }))
  t.throws(() => assertManifest({ name: true }))
  t.throws(() => asManifestRegistry({ name: true }))
  t.throws(() => assertManifestRegistry({ name: true }))
  t.equal(isManifestRegistry({ name: true }), false)
  t.equal(isManifest({ name: true }), false)
  const pdm = {
    ...om,
    peerDependencies: { x: '1.2.3' },
    peerDependenciesMeta: { x: { optional: true } },
  }
  t.equal(isManifest(pdm), true)

  t.end()
})

t.test('packument', t => {
  const op: Record<any, any> = {
    name: 'x',
    'dist-tags': { x: '1.2.3' },
    versions: {
      '1.2.3': {
        name: 'x',
        version: '1.2.3',
        dist: { tarball: 'x' },
      },
    },
  } as const
  //@ts-expect-error
  const pnope: Packument = op
  pnope
  const pok: Packument = asPackument(op)
  assertPackument(op)
  const ppp: Packument = op
  ppp

  //@ts-expect-error
  pok.foo = 'bar'
  t.equal(isPackument({}), false)
  t.throws(() => asPackument({}))
  t.throws(() => assertPackument({}))

  t.end()
})

t.test('keyID', t => {
  const k: KeyID =
    'SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA'
  t.equal(isKeyID(k), true)
  //@ts-expect-error
  const kNotKey: KeyID = 'sha256:hello'
  t.equal(isKeyID(kNotKey), false)
  //@ts-expect-error
  const str: KeyID = 'hello'
  t.equal(isKeyID(str), false)
  let keyOK = ''
  keyOK = 'SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA'
  //@ts-expect-error - still just a string as far as TS knows
  const kNope: KeyID = keyOK
  kNope
  const asKey: KeyID = asKeyID(keyOK)
  asKey
  t.throws(() => asKeyID('hello'))
  assertKeyID(keyOK)
  // now it's ok
  const kAsserted: KeyID = keyOK
  kAsserted
  t.end()
})

t.test('integrity', t => {
  const i: Integrity =
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
  t.equal(isIntegrity(i), true)
  //@ts-expect-error
  const iNotIntegrity: Integrity = 'SHA512-hello'
  t.equal(isIntegrity(iNotIntegrity), false)
  //@ts-expect-error
  const iNotInt: Integrity = 'hello'
  t.equal(isIntegrity(iNotInt), false)
  t.throws(() => asIntegrity('hello'))
  let intOK = ''
  intOK =
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
  //@ts-expect-error - still just a string as far as TS knows
  const iNope: Integrity = intOK
  iNope
  const asInt: Integrity = asIntegrity(intOK)
  asInt
  assertIntegrity(intOK)
  // now it's ok
  const iAsserted: Integrity = intOK
  iAsserted
  t.end()
})

t.test('type checks', t => {
  //@ts-expect-error
  let b: Bugs = { hello: 'world' }
  b
  b = { url: 'string' }
  b = { email: 'string' }
  //@ts-expect-error
  b = 123
  //@ts-expect-error
  let c: ConditionalValue = { default: true }
  c
  c = { default: 'string' }
  c = null
  //@ts-expect-error
  let cv: ConditionalValueObject = 'string'
  cv
  //@ts-expect-error
  cv = null
  cv = { default: { require: 'string' } }
  //@ts-expect-error
  let d: Dist = { nope: 'not ok' }
  d
  d = { tarball: 'url' }
  //@ts-expect-error
  d = { tarball: 'url', integrity: 'rando blaregosasedf' }
  d = { tarball: 'url', integrity: 'sha512-this is fine' }
  //@ts-expect-error
  let e: Exports = null
  e
  e = { require: { default: 'string' } }
  //@ts-expect-error
  let es: ExportsSubpaths = null
  es
  //@ts-expect-error
  es = { 'invalid path': 'foo' }
  es = { '.': { default: 'foo' } }
  es = { './foo': null }
  es = { './foo': null, '.': { default: 'foo' } }
  es = {}

  //@ts-expect-error
  let f: Funding = true
  f
  f = { url: 'string' }
  f = 'string'
  f = ['string', 'string']
  f = ['string', { url: 'string' }]

  //@ts-expect-error
  let imp: Imports = null
  imp
  //@ts-expect-error
  imp = { './invalid': 'subpath' }
  imp = { '#valid': 'subpath' }

  //@ts-expect-error
  let ig: Integrity = 'hello'
  ig
  //@ts-expect-error
  ig = true
  //@ts-expect-error
  ig = { Integrity: 'sha512-asdf' }
  ig = 'sha512-asdf'

  //@ts-expect-error
  let jf: JSONField = /x/
  jf
  //@ts-expect-error
  jf = () => {}
  jf = { hello: [{ world: null }] }
  jf = null
  jf = true
  jf = 123

  //@ts-expect-error
  let k: KeyID = 'heblo'
  k
  k = 'SHA256:asdf'
  //@ts-expect-error
  k = true

  let m: Manifest = {}
  m
  //@ts-expect-error
  m = { name: true, dependencies: /x/ }
  m = { name: 'x', version: '1.0.0', license: 'MIT' }
  //@ts-expect-error
  m = { name: 'x', version: '1.0.0', license: 123 }

  //@ts-expect-error
  let rm: ManifestRegistry = {}
  rm
  rm = { name: 'string', version: 'string', dist: { tarball: 'url' } }
  rm = {
    name: 'string',
    version: 'string',
    //@ts-expect-error
    dist: { tarball: 'url', integrity: 'hello' },
  }
  const dist = { foo: 'x' }
  //@ts-expect-error
  rm.dist = dist

  const p: Packument = {
    name: 'x',
    'dist-tags': {},
    versions: {},
  }
  //@ts-expect-error
  p.versions['1.2.3'] = { name: true }
  //@ts-expect-error
  p.foo = 'baz'
  //@ts-expect-error
  p.foo = 'bar'

  const pd: Exclude<Manifest['peerDependenciesMeta'], undefined> = {}
  //@ts-expect-error
  pd.foo = true
  const pdm: PeerDependenciesMetaValue = { optional: false }
  //@ts-expect-error
  pdm.optional = 'foo'
  //@ts-expect-error
  pdm.foo = 'bar'

  let pr: Person = { name: 'x' }
  pr
  //@ts-expect-error
  pr = { name: true }
  pr = 'Hello'
  pr = { name: '', email: '', url: '' }

  let r: Repository = { type: 'git', url: 'github' }
  r
  r = 'git+ssh://git@github.com:a/b'
  //@ts-expect-error
  r = { url: 'github' }
  //@ts-expect-error
  r = { type: 'git' }

  t.pass('all typechecks passed')
  t.end()
})

t.test('dependency types', t => {
  t.test('dependencyTypes', async t => {
    t.strictSame(
      [...longDependencyTypes],
      [...dependencyTypes.keys()],
      'should have the exact same long dependency types as keys of long types map',
    )
  })

  t.end()
})

t.test('asError', t => {
  t.ok(asError(new Error('')) instanceof Error)
  t.ok(asError(null) instanceof Error)
  t.ok(asError('').message === 'Unknown error')
  t.end()
})

t.test('isErrorWithCause type guard', async t => {
  t.equal(isErrorWithCause(new Error('plain')), false)
  t.equal(
    isErrorWithCause(
      new Error('with cause', { cause: new Error('inner cause') }),
    ),
    true,
  )
  t.equal(
    isErrorWithCause(
      new Error('with cause obj', { cause: { code: 'ENOENT' } }),
    ),
    true,
  )
  t.equal(isErrorWithCause({ cause: 'something' }), false)
  t.equal(isErrorWithCause({ message: 'no cause' }), false)
  t.equal(isErrorWithCause(null), false)
  t.equal(isErrorWithCause(undefined), false)
  t.equal(isErrorWithCause('a string'), false)
  t.equal(isErrorWithCause(123), false)
})

t.test('isObject', async t => {
  t.equal(isObject({}), true)
  t.equal(isObject(null), false)
  t.equal(isObject(undefined), false)
  t.equal(isObject(Object.create(null)), true)
  t.equal(isObject('a string'), false)
  t.equal(isObject(123), false)
})

t.test('isRecordStringString', async t => {
  t.equal(isRecordStringString({}), true)
  t.equal(isRecordStringString({ a: '1' }), true)
  t.equal(isRecordStringString({ a: 1 }), false)
  t.equal(isRecordStringString(['1']), false)
})

t.test('isRecordStringT', async t => {
  const isRegExp = (x: unknown): x is RegExp =>
    !!x && typeof x === 'object' && x instanceof RegExp
  t.equal(isRecordStringT({}, isRegExp), true)
  t.equal(isRecordStringT({ a: /1/ }, isRegExp), true)
  t.equal(isRecordStringT({ a: 1 }, isRegExp), false)
  t.equal(isRecordStringT([/1/], isRegExp), false)
})

t.test('assertRecordStringString', async t => {
  assertRecordStringString({})
  assertRecordStringString({ a: '1' })
  t.throws(() => assertRecordStringString({ a: 1 }))
  t.throws(() => assertRecordStringString(['1']))
})

t.test('isRecordStringT', async t => {
  const isRegExp = (x: unknown): x is RegExp =>
    !!x && typeof x === 'object' && x instanceof RegExp
  t.equal(isRecordStringT({}, isRegExp), true)
  t.equal(isRecordStringT({ a: /1/ }, isRegExp), true)
  t.equal(isRecordStringT({ a: 1 }, isRegExp), false)
  t.equal(isRecordStringT([/1/], isRegExp), false)
})

t.test('assertRecordStringT', async t => {
  const isRegExp = (x: unknown): x is RegExp =>
    !!x && typeof x === 'object' && x instanceof RegExp

  const wanted = 'Record<string, RegExp>'
  assertRecordStringT({}, isRegExp, wanted)
  assertRecordStringT({ a: /1/ }, isRegExp, wanted)
  t.throws(() => assertRecordStringT({ a: 1 }, isRegExp, wanted), {
    cause: { wanted },
  })
  t.throws(() => assertRecordStringT(['1'], isRegExp, wanted), {
    cause: { wanted },
  })
})

t.test('normalizeFunding', t => {
  t.test('handles undefined and null', t => {
    t.equal(normalizeFunding(undefined), undefined)
    t.equal(normalizeFunding(null), undefined)
    t.end()
  })

  t.test('handles string funding', t => {
    const result = normalizeFunding(
      'https://github.com/sponsors/user',
    )
    t.same(result, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
    ])
    t.end()
  })

  t.test('handles object funding', t => {
    const funding = { url: 'https://github.com/sponsors/user' }
    const result = normalizeFunding(funding)
    t.same(result, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
    ])
    t.end()
  })

  t.test('handles array of strings', t => {
    const funding = [
      'https://github.com/sponsors/user',
      'https://patreon.com/user',
    ]
    const result = normalizeFunding(funding)
    t.same(result, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
      { url: 'https://patreon.com/user', type: 'patreon' },
    ])
    t.end()
  })

  t.test('handles mixed array', t => {
    const funding = [
      'https://github.com/sponsors/user',
      { url: 'https://patreon.com/user' },
    ]
    const result = normalizeFunding(funding)
    t.same(result, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
      { url: 'https://patreon.com/user', type: 'patreon' },
    ])
    t.end()
  })

  t.test('handles invalid funding entries', t => {
    const result = normalizeFunding({ invalid: 'data' })
    t.same(result, [{ url: '', type: 'individual' }])
    t.end()
  })

  t.test('preserves valid type for known domains', t => {
    const result = normalizeFunding({
      url: 'https://patreon.com/user',
      type: 'patreon',
    })
    t.same(result, [
      { url: 'https://patreon.com/user', type: 'patreon' },
    ])
    t.end()
  })

  t.test('preserves custom type for unknown domains', t => {
    const result = normalizeFunding({
      url: 'https://example.com/donate',
      type: 'custom',
    })
    t.same(result, [
      { url: 'https://example.com/donate', type: 'custom' },
    ])
    t.end()
  })

  t.test('preserves custom type for valid URLs', t => {
    const result = normalizeFunding({
      url: 'https://buymeacoffee.com/user',
      type: 'buymeacoffee',
    })
    t.same(result, [
      { url: 'https://buymeacoffee.com/user', type: 'buymeacoffee' },
    ])
    t.end()
  })

  t.test('handles invalid URLs', t => {
    const result = normalizeFunding('not-a-valid-url')
    t.same(result, [{ url: 'not-a-valid-url', type: 'invalid' }])
    t.end()
  })

  t.test('handles invalid URLs with custom type', t => {
    const result = normalizeFunding({
      url: 'invalid-url-format',
      type: 'custom',
    })
    // When URL is invalid, even custom types get removed
    t.same(result, [{ url: 'invalid-url-format' }])
    t.end()
  })

  t.test('handles www subdomain URLs', t => {
    const result = normalizeFunding(
      'https://www.github.com/sponsors/user',
    )
    t.same(result, [
      { url: 'https://www.github.com/sponsors/user', type: 'github' },
    ])
    t.end()
  })

  t.test('handles opencollective URLs', t => {
    const result = normalizeFunding(
      'https://opencollective.com/project',
    )
    t.same(result, [
      {
        url: 'https://opencollective.com/project',
        type: 'opencollective',
      },
    ])
    t.end()
  })

  t.end()
})

t.test('normalizeManifest', t => {
  t.test('returns same manifest when no funding', t => {
    const manifest = { name: 'test', version: '1.0.0' }
    const result = normalizeManifest(manifest)
    t.equal(result, manifest, 'should return same object reference')
    t.end()
  })

  t.test('normalizes manifest with object funding', t => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      funding: { url: 'https://github.com/sponsors/user' },
    }
    const result = normalizeManifest(manifest)
    t.not(result, manifest, 'should return new object reference')
    t.same(result.funding, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
    ])
    t.end()
  })

  t.test('normalizes manifest with string funding', t => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      funding: 'https://github.com/sponsors/user',
    }
    const result = normalizeManifest(manifest)
    t.not(result, manifest, 'should return new object reference')
    t.same(result.funding, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
    ])
    t.end()
  })

  t.test('preserves other manifest properties', t => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      description: 'A test package',
      funding: 'https://github.com/sponsors/user',
      dependencies: { foo: '^1.0.0' },
    }
    const result = normalizeManifest(manifest)
    t.same(result.funding, [
      { url: 'https://github.com/sponsors/user', type: 'github' },
    ])
    t.same(result.name, manifest.name)
    t.same(result.description, manifest.description)
    t.same(result.dependencies, manifest.dependencies)
    t.end()
  })

  t.end()
})
