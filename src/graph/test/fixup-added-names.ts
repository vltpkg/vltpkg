import { Spec } from '@vltpkg/spec'
import t from 'tap'
import type { Dependency } from '../src/dependencies.ts'
import { fixupAddedNames } from '../src/fixup-added-names.ts'

t.test('fixupAddedNames', async t => {
  t.test('returns original spec when add is undefined', async t => {
    const spec = Spec.parse('foo', '^1.0.0')
    const result = fixupAddedNames(
      undefined,
      { name: 'foo' },
      {},
      spec,
    )
    t.equal(result, spec, 'should return same spec')
  })

  t.test(
    'returns original spec when manifest is undefined',
    async t => {
      const add = new Map<string, Dependency>()
      const spec = Spec.parse('(unknown)', 'file:../c')
      const result = fixupAddedNames(add, undefined, {}, spec)
      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'returns original spec when manifest.name is undefined',
    async t => {
      const add = new Map<string, Dependency>()
      const spec = Spec.parse('(unknown)', 'file:../c')
      const result = fixupAddedNames(add, {}, {}, spec)
      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'returns original spec when spec.name is not (unknown)',
    async t => {
      const add = new Map<string, Dependency>()
      const spec = Spec.parse('foo', '^1.0.0')
      const result = fixupAddedNames(add, { name: 'bar' }, {}, spec)
      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'returns original spec when spec not found in add map',
    async t => {
      const add = new Map<string, Dependency>()
      const spec = Spec.parse('(unknown)', 'file:../c')
      // add map is empty, spec won't be found
      const result = fixupAddedNames(add, { name: 'c' }, {}, spec)
      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'fixes unknown name when all conditions are met',
    async t => {
      const spec = Spec.parse('(unknown)', 'file:../c')
      const add = new Map<string, Dependency>()
      add.set(String(spec), { type: 'implicit', spec })

      const result = fixupAddedNames(add, { name: 'c' }, {}, spec)

      t.not(result, spec, 'should return new spec')
      t.equal(result.name, 'c', 'should have correct name')
      t.equal(
        result.bareSpec,
        'file:../c',
        'should preserve bareSpec',
      )
      t.equal(result.type, 'file', 'should preserve type')

      t.notOk(
        add.has(String(spec)),
        'should delete old placeholder entry',
      )
      t.ok(add.has('c'), 'should add new entry with correct name')

      const newEntry = add.get('c')
      t.equal(
        newEntry?.type,
        'implicit',
        'should preserve dependency type',
      )
      t.equal(
        newEntry?.spec.name,
        'c',
        'should have correct spec name',
      )
    },
  )

  t.test('passes options to spec parsing', async t => {
    const spec = Spec.parse('(unknown)', 'file:../c')
    const add = new Map<string, Dependency>()
    add.set(String(spec), { type: 'prod', spec })

    const options = { registry: 'https://custom.registry.com/' }
    const result = fixupAddedNames(
      add,
      { name: 'my-pkg' },
      options,
      spec,
    )

    t.equal(result.name, 'my-pkg', 'should have correct name')
    t.equal(
      result.options.registry,
      'https://custom.registry.com/',
      'should use provided options',
    )
  })

  t.test('handles remote tarball specs', async t => {
    const spec = Spec.parse(
      '(unknown)',
      'https://example.com/pkg.tgz',
    )
    const add = new Map<string, Dependency>()
    add.set(String(spec), { type: 'dev', spec })

    const result = fixupAddedNames(
      add,
      { name: 'my-remote' },
      {},
      spec,
    )

    t.equal(result.name, 'my-remote', 'should have correct name')
    t.equal(result.type, 'remote', 'should preserve remote type')
    t.ok(add.has('my-remote'), 'should add new entry')
    t.notOk(add.has(String(spec)), 'should remove old entry')
  })
})
