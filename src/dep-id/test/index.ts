import { Spec } from '@vltpkg/spec'
import { type Manifest } from '@vltpkg/types'
import t from 'tap'
import {
  asDepID,
  delimiter,
  type DepID,
  getId,
  getTuple,
  hydrate,
  hydrateTuple,
  isDepID,
  joinDepIDTuple,
  splitDepID,
} from '../src/index.ts'

const mani: Manifest = { name: 'manifest-name', version: '1.2.3' }
t.test('valid specs', t => {
  const specs = [
    'x@1.2.3',
    'x@1',
    'y@1.2.3',
    'y@npm:x@1.2.3',
    'y@npm:x@1',
    'y@npm:x@github:a/b#branch',
    'y@registry:https://x.com#x@1',
    'y@registry:https://registry.npmjs.org#x@1',
    'y@registry:https://registry.npmjs.org/#x@1',
    'x@git+ssh://host.com/x.git',
    'x@git+ssh://host.com/x.git#branch',
    'x@git+ssh://host.com/x.git#semver:1',
    'x@github:a/b',
    'x@github:a/b#branch',
    'x@github:a/b#semver:1',
    'x@https://x.com/x.tgz',
    'x@a:asfd@1.2.3',
    'x@b:asfd@1.2.3',
    'x@registry:https://a.example.com/#asfd@1.2.3',
    'x@registry:https://b.example.com/#asfd@1.2.3',
    'x@registry:https://c.example.com/#asfd@1.2.3',
  ]
  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }

  for (const s of specs) {
    t.test(s, t => {
      const spec = Spec.parse(s, { registries })
      const tuple = getTuple(spec, mani)
      const id = getId(spec, mani)
      t.matchSnapshot([id, tuple])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const h = hydrate(id, 'x', { registries })
      const ht = hydrateTuple(tuple, 'x', { registries })
      t.strictSame(h, ht, 'same in both hydrations')
      t.matchSnapshot(String(h), 'hydrated')
      const hunknown = hydrate(id, undefined, { registries })
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf', { registries })
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y', { registries })
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  const scopedMani: Manifest = {
    name: '@scoped/manifest-name',
    version: '1.2.3',
  }
  const scopedSpecs = [
    '@scoped/x@1.2.3',
    '@scoped/x@npm:@scoped/x@1.2.3',
    'y@npm:@scoped/x@1.2.3',
    '@scoped/y@npm:@scoped/x@1.2.3',
    '@scoped/x@github:a/b',
  ]
  for (const s of scopedSpecs) {
    t.test(s, t => {
      const spec = Spec.parse(s)
      const tuple = getTuple(spec, scopedMani)
      const id = getId(spec, scopedMani)
      t.matchSnapshot([id, tuple])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const hscoped = hydrate(id, '@scoped/x')
      t.matchSnapshot(String(hscoped), 'hydrated with scoped name')
      const hunknown = hydrate(id)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf')
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y')
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  t.end()
})

t.test('hydrate only', t => {
  const hydrateOnlyDepIDs: DepID[] = [
    `file${delimiter}x.tgz`,
    `file${delimiter}./x.tgz`,
    `file${delimiter}///x.tgz`,
    `file${delimiter}~/x.tgz`,
    `workspace${delimiter}./a`,
    `workspace${delimiter}a`,
  ]
  for (const id of hydrateOnlyDepIDs) {
    t.test(id, t => {
      const hscoped = hydrate(id, '@scoped/x')
      t.matchSnapshot(String(hscoped), 'hydrated with scoped name')
      const hunknown = hydrate(id)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf')
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y')
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  t.end()
})

t.test('named registry', t => {
  const options = { registries: { vlt: 'http://vlt.sh' } }
  t.equal(
    String(
      hydrate(`${delimiter}vlt${delimiter}x@1.2.3`, 'x', options),
    ),
    'x@vlt:x@1.2.3',
  )
  t.end()
})

t.test('getId when manifest empty, fields just blank', t => {
  t.strictSame(getTuple(Spec.parse('x@1.2.3'), {}), [
    'registry',
    '',
    'x@1.2.3',
  ])
  t.end()
})

t.test('invalid values', t => {
  //@ts-expect-error
  t.throws(() => hydrateTuple(['workspace']))
  //@ts-expect-error
  t.throws(() => hydrate('workspace'))
  t.throws(() => hydrate(`workspace${delimiter}`))
  t.throws(() =>
    getId({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() =>
    getTuple({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() =>
    hydrate(`git${delimiter}github:${delimiter}branch`, 'x'),
  )
  t.throws(() =>
    hydrate(`git${delimiter}github:${delimiter}branch`, 'x'),
  )
  t.throws(() =>
    getId(
      { final: { type: 'git', namedGitHost: 'github' } } as Spec,
      mani,
    ),
  )
  t.throws(() =>
    getTuple(
      {
        final: {
          type: 'git',
          gitRemote: 'x',
          namedGitHost: 'github',
        },
      } as Spec,
      mani,
    ),
  )
  t.throws(() => hydrateTuple(['git', '', ''], 'x'))
  //@ts-expect-error
  t.throws(() => hydrate(`git${delimiter}x`, 'x'))
  t.throws(() => getId({ final: { type: 'remote' } } as Spec, mani))
  t.throws(() =>
    getTuple({ final: { type: 'remote' } } as Spec, mani),
  )
  t.throws(() => getTuple({ final: { type: 'file' } } as Spec, mani))
  t.throws(() => hydrate(`${delimiter}xyz${delimiter}x@1.2.1`, 'x'))
  t.throws(() => hydrate(`${delimiter}${delimiter}`, 'x'))
  //@ts-expect-error
  t.throws(() => hydrate(delimiter, 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry'], 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry', ''], 'x'))
  t.throws(() => hydrate(`file${delimiter}`, 'x'))
  t.throws(() => hydrate(`remote${delimiter}`, 'x'))
  t.throws(() =>
    splitDepID(`xyz${delimiter}a${delimiter}b${delimiter}c`),
  )
  t.end()
})

const validDepIDs: DepID[] = [
  `${delimiter}${delimiter}foo@1.0.0`,
  `git${delimiter}github%3Aa§b${delimiter}branch`,
  `remote${delimiter}https%3A§§x.com§x.tgz`,
  `file${delimiter}.§x.tgz`,
  `workspace${delimiter}a`,
  `${delimiter}${delimiter}foo@1.0.0${delimiter}extra`,
  `git${delimiter}github%3Aa§b${delimiter}branch${delimiter}extra`,
  `remote${delimiter}https%3A§§x.com§x.tgz${delimiter}extra`,
  `file${delimiter}.§x.tgz${delimiter}extra`,
  `workspace${delimiter}a${delimiter}extra`,
]
const invalidDepIDs = ['', 'git', 'abobrinha', 'https://example.com']
t.test('asDepID', t => {
  const typeCheckDepID = (id: DepID) => id
  for (const id of validDepIDs) {
    t.ok(typeCheckDepID(asDepID(id)), id)
    t.equal(joinDepIDTuple(splitDepID(id)), id)
  }
  for (const id of invalidDepIDs) {
    t.throws(() => asDepID(id), id)
  }
  t.end()
})

t.test('isDepID', t => {
  for (const id of validDepIDs) {
    t.ok(isDepID(id), id)
  }
  for (const id of invalidDepIDs) {
    t.notOk(isDepID(id), id)
  }
  t.end()
})
