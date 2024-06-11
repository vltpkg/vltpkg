import { Spec } from '@vltpkg/spec'
import { Manifest } from '@vltpkg/types'
import t from 'tap'
import {
  asDepID,
  DepID,
  getId,
  getTuple,
  isDepID,
  hydrate,
  hydrateTuple,
  joinDepIDTuple,
  splitDepID,
} from '../src/index.js'

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
    'x@file:x.tgz',
    'x@file:./x.tgz',
    'x@file:///x.tgz',
    'x@file:~/x.tgz',
    'x@https://x.com/x.tgz',
    'x@workspace:*',
    'x@workspace:y@*',
    'x@workspace:~',
    'x@workspace:1.x',
    'x@workspace:y@1.x',
  ]

  for (const s of specs) {
    t.test(s, t => {
      const spec = Spec.parse(s)
      const tuple = getTuple(spec, mani)
      const id = getId(spec, mani)
      t.matchSnapshot([id, tuple])
      t.equal(joinDepIDTuple(tuple), id)
      t.strictSame(splitDepID(id), tuple)
      const h = hydrate(id, 'x')
      const ht = hydrateTuple(tuple, 'x')
      t.strictSame(h, ht, 'same in both hydrations')
      t.matchSnapshot(String(h), 'hydrated')
      const hunknown = hydrate(id)
      t.matchSnapshot(String(hunknown), 'hydrated with name unknown')
      const hasdf = hydrate(id, 'asdf')
      t.matchSnapshot(String(hasdf), 'hydrated with name asdf')
      const hy = hydrate(id, 'y')
      t.matchSnapshot(String(hy), 'hydrated with name y')
      t.end()
    })
  }

  const scopedMani: Manifest = { name: '@scoped/manifest-name', version: '1.2.3' }
  const scopedSpecs = [
    '@scoped/x@1.2.3',
    '@scoped/x@npm:@scoped/x@1.2.3',
    'y@npm:@scoped/x@1.2.3',
    '@scoped/y@npm:@scoped/x@1.2.3',
    '@scoped/x@github:a/b',
    '@scoped/x@workspace:*',
    '@scoped/x@workspace:@scoped/x@*',
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

  t.strictSame(
    getId(Spec.parse('x@workspace:*'), {}),
    'workspace;x',
    'workspace id with missing manifest',
  )
  t.end()
})

t.test('named registry', t => {
  const options = { registries: { vlt: 'http://vlt.sh' } }
  t.equal(
    String(hydrate('registry;vlt;x@1.2.3', 'x', options)),
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
  t.throws(() => hydrate('workspace;'))
  t.throws(() =>
    getId({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() =>
    getTuple({ final: { type: 'workspace' } } as Spec, mani),
  )
  t.throws(() => hydrate('git;github:;branch', 'x'))
  t.throws(() => hydrate('git;github:;branch', 'x'))
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
  t.throws(() => hydrateTuple(['git', 'x'], 'x'))
  //@ts-expect-error
  t.throws(() => hydrate('git;x', 'x'))
  t.throws(() => getId({ final: { type: 'remote' } } as Spec, mani))
  t.throws(() =>
    getTuple({ final: { type: 'remote' } } as Spec, mani),
  )
  t.throws(() => getTuple({ final: { type: 'file' } } as Spec, mani))
  t.throws(() => hydrate('registry;xyz;x@1.2.1', 'x'))
  t.throws(() => hydrate('registry;;', 'x'))
  //@ts-expect-error
  t.throws(() => hydrate('registry;', 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry'], 'x'))
  //@ts-expect-error
  t.throws(() => hydrateTuple(['registry', ''], 'x'))
  t.throws(() => hydrate('file;', 'x'))
  t.throws(() => hydrate('remote;', 'x'))
  t.throws(() => splitDepID('xyz;a;b;c'))
  t.end()
})

const validDepIDs = [
  'registry;;foo@1.0.0',
  'git;github%3Aa%2Fb;branch',
  'remote;https%3A%2F%2Fx.com%2Fx.tgz',
  'file;.%2Fx.tgz',
  'workspace;a',
]
const invalidDepIDs = ['', 'git', 'abobrinha', 'https://example.com']
t.test('asDepID', t => {
  const typeCheckDepID = (id: DepID) => id
  for (const id of validDepIDs) {
    t.ok(typeCheckDepID(asDepID(id)), id)
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
