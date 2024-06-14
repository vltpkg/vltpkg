import t from 'tap'
import {
  DependencyTypeLong,
  dependencyTypes,
  longDependencyTypes,
  shorten,
} from '../src/dependencies.js'

t.test('dependencyTypes', async t => {
  t.strictSame(
    [...longDependencyTypes],
    [...dependencyTypes.keys()],
    'should have the exact same long dependency types as keys of long types map',
  )
})

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
