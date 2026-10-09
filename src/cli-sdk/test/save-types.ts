import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { addKey, asDependency } from '@vltpkg/graph'
import type {
  AddImportersDependenciesMap,
  Dependency,
} from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { pickManifest } from '@vltpkg/pick-manifest'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest, Packument } from '@vltpkg/types'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'
import {
  addTypesDeps,
  hasOwnTypes,
  typesName,
} from '../src/save-types.ts'

const reg = 'https://registry.example.com/'
const other = 'https://other.example.com/'
const specOptions: SpecOptions = {
  registry: reg,
  registries: { npm: reg, custom: other },
  'scoped-registries': { '@myco': other },
}

const packument = (
  name: string,
  versions: Record<string, Partial<Manifest>>,
): Packument => {
  const vers = Object.keys(versions)
  return {
    name,
    'dist-tags': { latest: vers[vers.length - 1] ?? '' },
    versions: Object.fromEntries(
      Object.entries(versions).map(([version, m]) => [
        version,
        { name, version, ...m },
      ]),
    ),
  }
}

const packuments = Object.fromEntries(
  [
    packument('express', { '4.21.2': {}, '5.1.0': {} }),
    packument('@types/express', { '4.17.21': {}, '5.0.3': {} }),
    packument('zod', {
      '3.25.0': { exports: { '.': { types: './index.d.ts' } } },
    }),
    packument('bare', { '1.0.0': {} }),
    packument('lib', { '3.0.0': {} }),
    packument('@types/lib', { '2.0.0': {} }),
    packument('stub', { '1.0.0': {} }),
    packument('@types/stub', {
      '1.0.0': { deprecated: 'stub types, stub has its own' },
    }),
    packument('ostub', { '2.0.0': {} }),
    packument('@types/ostub', {
      '1.0.0': { deprecated: 'stub types, ostub has its own' },
    }),
    packument('newer', { '1.0.0': {} }),
    packument('@types/newer', { '2.0.0': {} }),
    packument('lnover', { '2.0.0': {} }),
    packument('tboom', { '1.0.0': {} }),
    packument('tnover', { '1.0.0': {} }),
    packument('@scope/pkg', { '1.2.0': {} }),
    packument('@types/scope__pkg', { '1.0.0': {} }),
    packument('lodash.debounce', { '4.0.8': {} }),
    packument('@types/lodash.debounce', { '4.0.9': {} }),
    packument('zero', { '0.3.0': {} }),
    packument('@types/zero', { '0.3.1': {}, '0.5.0': {} }),
    packument('typed', { '1.0.0': {} }),
    packument('@types/typed', { '1.0.0': {} }),
  ].map(p => [p.name, p]),
)

// full packument: types fields the abbreviated one omits
const fullPackuments: Record<string, Packument> = {
  typed: packument('typed', {
    '1.0.0': { exports: { types: './index.d.ts' } },
  }),
}

const setup = (dir: string, values: Record<string, unknown> = {}) => {
  const calls: string[] = []
  const packageInfo = {
    async manifest(spec: Spec) {
      const { name } = spec.final
      calls.push(`${name}@${spec.final.bareSpec}`)
      if (name === 'boom' || name === '@types/tboom') {
        throw new Error('socket hang up')
      }
      if (
        name === 'nover' ||
        name === '@types/tnover' ||
        (name === '@types/lnover' && spec.final.distTag)
      )
        return { name }
      const p = packuments[name]
      const m = p && pickManifest(p, spec)
      if (!m) throw error('Could not resolve', { code: 'ERESOLVE' })
      return m
    },
    async packument(spec: Spec, { full }: { full?: boolean }) {
      const { name } = spec.final
      calls.push(`${full ? 'full ' : ''}${name}`)
      return fullPackuments[name] ?? packuments[name]
    },
  }
  const conf = {
    values: { 'save-prefix': '^', ...values },
    options: {
      ...specOptions,
      projectRoot: dir,
      packageJson: new PackageJson(),
      packageInfo,
    },
  } as unknown as LoadedConfig
  return { calls, conf }
}

const root = joinDepIDTuple(['file', '.'])
const wsA = joinDepIDTuple(['workspace', 'packages/a'])
const wsB = joinDepIDTuple(['workspace', 'packages/b'])
const wsC = joinDepIDTuple(['workspace', 'packages/c'])

const deps = (...args: string[]) =>
  new Map<string, Dependency>(
    args.map(a => {
      const spec = Spec.parseArgs(a, specOptions)
      return [addKey(spec), asDependency({ spec, type: 'implicit' })]
    }),
  )

const addMap = (
  ...entries: [DepID, Map<string, Dependency>][]
): AddImportersDependenciesMap =>
  Object.assign(new Map(entries), { modifiedDependencies: true })

const result = (add: AddImportersDependenciesMap, id = root) =>
  Object.fromEntries(
    [...(add.get(id) ?? [])].map(([k, d]) => [
      k,
      `${d.type} ${d.spec.bareSpec}`,
    ]),
  )

t.test('typesName', async t => {
  t.equal(typesName('express'), '@types/express')
  t.equal(typesName('@scope/pkg'), '@types/scope__pkg')
})

t.test('hasOwnTypes', async t => {
  t.ok(hasOwnTypes({ types: 'index.d.ts' }))
  t.ok(hasOwnTypes({ typings: 'index.d.ts' }))
  t.ok(hasOwnTypes({ typesVersions: { '*': {} } }))
  t.ok(
    hasOwnTypes({
      exports: { '.': { import: { types: './i.d.ts' } } },
    }),
  )
  t.ok(hasOwnTypes({ exports: ['./x.js', { types: './i.d.ts' }] }))
  t.ok(hasOwnTypes({ exports: { 'types@>=5': './i.d.ts' } }))
  t.notOk(hasOwnTypes({ exports: './index.js' }))
  t.notOk(
    hasOwnTypes({
      exports: { '.': './i.js', './sub': { types: './s.d.ts' } },
    }),
    'typed subpath only',
  )
  t.notOk(
    hasOwnTypes({ exports: { './sub': { types: './s.d.ts' } } }),
  )
  t.notOk(hasOwnTypes({ exports: { '.': { import: './i.js' } } }))
  t.notOk(hasOwnTypes({}))
})

t.test('addTypesDeps', async t => {
  t.test('adds @types in the pkg major', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir)
    const add = addMap([root, deps('express@4', 'lodash.debounce')])
    await addTypesDeps(conf, add)
    t.strictSame(result(add), {
      express: 'implicit 4',
      'lodash.debounce': 'implicit ',
      '@types/express': 'dev ^4.17.21',
      '@types/lodash.debounce': 'dev ^4.0.9',
    })
  })

  t.test('0.x uses major.minor', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf, calls } = setup(dir)
    const add = addMap([root, deps('zero')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/zero'], 'dev ^0.3.1')
    t.ok(calls.includes('@types/zero@0.3'))
  })

  t.test('older-major latest when none in major', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf, calls } = setup(dir)
    const add = addMap([root, deps('lib@3')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/lib'], 'dev ^2.0.0')
    t.strictSame(calls, [
      'lib@3',
      '@types/lib@3',
      '@types/lib@latest',
      'full lib',
    ])
  })

  t.test('latest major when no range', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir)
    const add = addMap([root, deps('express')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/express'], 'dev ^5.0.3')
  })

  t.test('npm: alias of same name', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir)
    const add = addMap([root, deps('npm:express@4')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/express'], 'dev ^4.17.21')
  })

  t.test('scoped pkg', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir)
    const add = addMap([root, deps('@scope/pkg')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/scope__pkg'], 'dev ^1.0.0')
  })

  t.test('save-exact', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir, { 'save-exact': true })
    const add = addMap([root, deps('express@4')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/express'], 'dev 4.17.21')
  })

  t.test('save-prefix', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir, { 'save-prefix': '~' })
    const add = addMap([root, deps('express@4')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/express'], 'dev ~4.17.21')
  })

  t.test('skips', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf, calls } = setup(dir)
    const original = deps(
      'zod',
      'bare',
      'stub',
      'ostub',
      'newer',
      'lnover',
      'typed',
      'missing',
      'nover',
      'tnover',
      'github:a/b',
      'file:./x',
      'https://x.com/x.tgz',
      'ws@workspace:*',
      'jsr:@std/foo',
      'foo@npm:bar@1',
      '@types/node',
      '@myco/pkg',
      'custom:thing',
    )
    const add = addMap([root, original])
    await addTypesDeps(conf, add)
    t.equal(add.get(root), original, 'map untouched')
    t.strictSame(calls.sort(), [
      '@types/bare@1',
      '@types/bare@latest',
      '@types/lnover@2',
      '@types/lnover@latest',
      '@types/newer@1',
      '@types/newer@latest',
      '@types/ostub@2',
      '@types/ostub@latest',
      '@types/stub@1',
      '@types/tnover@1',
      '@types/typed@1',
      'bare@',
      'full typed',
      'lnover@',
      'missing@',
      'newer@',
      'nover@',
      'ostub@',
      'stub@',
      'tnover@',
      'typed@',
      'zod@',
    ])
  })

  t.test('already declared', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        dependencies: { '@types/lodash.debounce': '^4' },
        devDependencies: { '@types/express': '^4' },
      }),
    })
    const { conf, calls } = setup(dir)
    const original = deps(
      'express@4',
      'lodash.debounce',
      'zod',
      '@types/zod@1',
    )
    const add = addMap([root, original])
    await addTypesDeps(conf, add)
    t.equal(add.get(root), original)
    t.strictSame(calls, [])
  })

  t.test('workspaces sharing one deps Map', async t => {
    const dir = t.testdir({
      'package.json': '{}',
      packages: {
        a: {
          'package.json': JSON.stringify({
            devDependencies: { '@types/express': '^5.0.0' },
          }),
        },
        b: { 'package.json': '{}' },
        c: { 'package.json': '{}' },
      },
    })
    const { conf, calls } = setup(dir)
    const shared = deps('express')
    const add = addMap([wsA, shared], [wsB, shared], [wsC, shared])
    await addTypesDeps(conf, add)
    t.equal(add.get(wsA), shared)
    t.equal(shared.size, 1)
    t.equal(result(add, wsB)['@types/express'], 'dev ^5.0.3')
    t.equal(result(add, wsC)['@types/express'], 'dev ^5.0.3')
    t.strictSame(
      calls,
      ['express@', '@types/express@5', 'full express'],
      'memoized',
    )
  })

  t.test('missing package.json', async t => {
    const dir = t.testdir({})
    const { conf } = setup(dir)
    const add = addMap([root, deps('express@4')])
    await addTypesDeps(conf, add)
    t.equal(result(add)['@types/express'], 'dev ^4.17.21')
  })

  t.test('rethrows other errors', async t => {
    const dir = t.testdir({ 'package.json': '{}' })
    const { conf } = setup(dir)
    for (const name of ['boom', 'tboom']) {
      await t.rejects(
        addTypesDeps(conf, addMap([root, deps(name)])),
        { message: 'socket hang up' },
        name,
      )
    }
  })
})
