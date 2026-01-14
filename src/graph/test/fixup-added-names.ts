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

  // Tests for empty bareSpec fixup logic
  t.test(
    'returns original spec when bareSpec is not empty',
    async t => {
      const spec = Spec.parse('foo', '^1.0.0')
      const add = new Map<string, Dependency>()
      add.set('foo', { type: 'prod', spec })

      const result = fixupAddedNames(
        add,
        { name: 'foo', version: '1.2.3' },
        {},
        spec,
      )

      t.equal(result, spec, 'should return same spec')
      t.equal(
        add.get('foo')?.spec,
        spec,
        'should not modify add entry',
      )
    },
  )

  t.test(
    'returns original spec when manifest.version is undefined for empty bareSpec',
    async t => {
      const spec = Spec.parse('foo', '')
      const add = new Map<string, Dependency>()
      add.set('foo', { type: 'prod', spec })

      const result = fixupAddedNames(add, { name: 'foo' }, {}, spec)

      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'returns original spec when spec.name not found in add map for empty bareSpec',
    async t => {
      const spec = Spec.parse('foo', '')
      const add = new Map<string, Dependency>()
      // add map is empty, spec won't be found

      const result = fixupAddedNames(
        add,
        { name: 'foo', version: '1.2.3' },
        {},
        spec,
      )

      t.equal(result, spec, 'should return same spec')
    },
  )

  t.test(
    'fixes empty bareSpec with calculated save value',
    async t => {
      const spec = Spec.parse('express', '')
      const add = new Map<string, Dependency>()
      add.set('express', { type: 'prod', spec })

      const result = fixupAddedNames(
        add,
        { name: 'express', version: '5.1.0' },
        {},
        spec,
      )

      t.not(result, spec, 'should return new spec')
      t.equal(result.name, 'express', 'should preserve name')
      t.equal(
        result.bareSpec,
        '^5.1.0',
        'should have calculated save value',
      )

      const updatedEntry = add.get('express')
      t.equal(
        updatedEntry?.spec.bareSpec,
        '^5.1.0',
        'should update add entry spec',
      )
    },
  )

  t.test(
    'does not modify spec when calculateSaveValue returns same value',
    async t => {
      // Non-registry type returns spec.bareSpec unchanged
      const spec = Spec.parse('my-pkg', 'file:../local')
      const add = new Map<string, Dependency>()
      add.set('my-pkg', { type: 'prod', spec })

      const result = fixupAddedNames(
        add,
        { name: 'my-pkg', version: '1.0.0' },
        {},
        spec,
      )

      t.equal(
        result,
        spec,
        'should return same spec for non-registry',
      )
    },
  )

  t.test('fixes both unknown name and empty bareSpec', async t => {
    // First fixes unknown name, then fixes empty bareSpec
    const spec = Spec.parse('(unknown)', '')
    const add = new Map<string, Dependency>()
    add.set(String(spec), { type: 'prod', spec })

    const result = fixupAddedNames(
      add,
      { name: 'lodash', version: '4.17.21' },
      {},
      spec,
    )

    t.not(result, spec, 'should return new spec')
    t.equal(result.name, 'lodash', 'should have correct name')
    t.equal(
      result.bareSpec,
      '^4.17.21',
      'should have calculated save value',
    )
    t.ok(add.has('lodash'), 'should have entry with correct name')
    t.notOk(add.has(String(spec)), 'should remove placeholder entry')
  })

  t.test(
    'passes options to spec parsing for empty bareSpec fixup',
    async t => {
      const spec = Spec.parse('foo', '')
      const add = new Map<string, Dependency>()
      add.set('foo', { type: 'prod', spec })

      const options = { registry: 'https://custom.registry.com/' }
      const result = fixupAddedNames(
        add,
        { name: 'foo', version: '2.0.0' },
        options,
        spec,
      )

      t.equal(
        result.bareSpec,
        '^2.0.0',
        'should have calculated save value',
      )
      t.equal(
        result.options.registry,
        'https://custom.registry.com/',
        'should use provided options',
      )
    },
  )
})
