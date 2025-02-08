import t from 'tap'
import {
  asDependency,
  asDependencyTypeShort,
  isDependency,
  isDependencyTypeShort,
  shorten,
} from '../src/dependencies.js'
import { Spec } from '@vltpkg/spec'
import { type DependencyTypeLong } from '@vltpkg/types'

t.test('shorten', async t => {
  t.strictSame(
    shorten('dependencies'),
    'prod',
    'should retrieve prod dep',
  )
  t.strictSame(
    shorten('devDependencies'),
    'dev',
    'should retrieve dev dep',
  )
  t.strictSame(
    shorten('optionalDependencies'),
    'optional',
    'should retrieve optional dep',
  )
  t.strictSame(
    shorten('peerDependencies'),
    'peer',
    'should retrieve peer dep',
  )
  t.strictSame(
    shorten('peerDependencies', 'foo', {
      peerDependenciesMeta: { foo: { optional: true } },
    }),
    'peerOptional',
    'should retrieve peerOptional dep',
  )
  t.strictSame(
    shorten('peerDependencies', undefined, {
      peerDependenciesMeta: { foo: { optional: true } },
    }),
    'peer',
    'should retrieve peer dep if there is no name to look up key on meta object',
  )
  t.throws(
    () => shorten('unknown' as DependencyTypeLong),
    /Invalid dependency type name/,
    'should throw if trying to retrieve from an unkown type',
  )
})

t.test('isDependency', async t => {
  const spec = Spec.parse('foo', '^1.0.0')
  t.ok(
    isDependency({
      spec,
      type: 'prod',
    }),
    'should be ok if object is a valid dependency shaped obj',
  )
  t.notOk(
    isDependency({
      spec,
      type: 'unkown',
    }),
    'should not be ok if object does not have a valid obj',
  )
  t.notOk(
    isDependency({}),
    'should not be ok if object is missing expected properties',
  )
})

t.test('asDependency', async t => {
  const spec = Spec.parse('foo', '^1.0.0')
  t.ok(
    asDependency({
      spec,
      type: 'prod',
    }),
    'should return typed object if a valid dependency shaped obj is found',
  )
  t.throws(
    () =>
      asDependency({
        spec,
        type: 'unkown',
      }),
    /Invalid dependency/,
    'should throw if object does not have a valid obj',
  )
  t.throws(
    () => asDependency({}),
    /Invalid dependency/,
    'should throw if object is missing expected properties',
  )
})

t.test('isDependencyTypeShort', async t => {
  t.ok(
    isDependencyTypeShort('prod'),
    'should be ok if type is a valid short type',
  )
  t.notOk(
    isDependencyTypeShort('unknown'),
    'should not be ok if type is not a valid short type',
  )
})

t.test('asDependencyTypeShort', async t => {
  const type = asDependencyTypeShort('prod')
  t.strictSame(type, 'prod', 'valid short type')

  t.throws(
    () => asDependencyTypeShort('unknown'),
    /Invalid dependency type/,
    'should throw if type is not a valid short type',
  )
})
