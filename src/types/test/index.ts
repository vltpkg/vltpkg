/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  asIntegrity,
  asKeyID,
  asManifest,
  asManifestMinified,
  asManifestRegistry,
  asPackument,
  asPackumentMinified,
  assertIntegrity,
  assertKeyID,
  assertManifest,
  assertManifestMinified,
  assertManifestRegistry,
  assertPackument,
  assertPackumentMinified,
  Bugs,
  ConditionalValueObject,
  Dist,
  ExportsSubpaths,
  Imports,
  Integrity,
  isIntegrity,
  isKeyID,
  isManifest,
  isManifestRegistry,
  isPackument,
  isPackumentMinified,
  JSONField,
  KeyID,
  Manifest,
  ManifestRegistry,
  Packument,
  PackumentBase,
  PackumentMinified,
  PeerDependenciesMetaValue,
  Person,
  Repository,
} from '../src/index.js'

import t from 'tap'

t.test('manifest', t => {
  t.equal(isManifest(true), false)
  t.equal(isManifest({ name: true }), false)
  t.equal(isManifest({ name: 'x' }), true)
  t.equal(isManifest({ name: 'x', version: null }), false)
  t.equal(isManifest({ name: 'x', version: 'y' }), true)
  t.equal(isManifest({ name: 'x', version: 420 }), false)
  const om: Record<any, unknown> = { name: 'x', version: '123' }
  //@ts-expect-error
  const mnope: Manifest = om
  mnope
  // this is fine, type-detected
  const mok: Manifest = asManifest(om)
  mok
  t.throws(() => asManifestRegistry(om))
  const rom = { ...om, type: 'commonjs', dist: { tarball: 'x' } }
  t.equal(asManifestRegistry(rom), rom)
  t.equal(asManifestMinified(om), om)
  t.throws(() => asManifest({ name: true }))
  t.throws(() => assertManifest({ name: true }))
  t.throws(() => asManifestMinified({ name: true }))
  t.throws(() => asManifestRegistry({ name: true }))
  t.throws(() => assertManifestMinified({ name: true }))
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
  assertPackumentMinified(op)
  const ppp: Packument = op
  ppp

  const pMinNope: PackumentMinified = asPackument(op)
  //@ts-expect-error
  pMinNope.foo = 'bar'
  pok.foo = 'bar'
  t.equal(isPackument({}), false)
  t.equal(isPackumentMinified({}), false)
  t.throws(() => asPackument({}))
  t.throws(() => asPackumentMinified({}))
  t.throws(() => assertPackument({}))
  t.throws(() => assertPackumentMinified({}))

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
  const keyOK = 'SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA'
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
  const intOK =
    'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
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

  //@ts-expect-error
  let mm: ManifestMinified = { tap: { typecheck: true } }
  mm
  mm = {}
  mm = { name: 's', version: 'v' }

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
  p.foo = 'baz'
  const pb: PackumentBase = p
  p.foo = 'bar'
  //@ts-expect-error
  pb.foo
  const pm: PackumentMinified = p
  //@ts-expect-error
  pm.foo = 'bar'
  pm.versions['1.2.3'] = m
  //@ts-expect-error
  pm.versions['1.2.3'].foo = 'bar'

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
