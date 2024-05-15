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
  Integrity,
  isIntegrity,
  isKeyID,
  isManifest,
  isManifestRegistry,
  isPackument,
  isPackumentMinified,
  KeyID,
  Manifest,
  Packument,
  PackumentMinified,
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
  let keyOK = 'SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA'
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
  let intOK =
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
