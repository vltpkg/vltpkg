import t from 'tap'
import { diffLockfiles, hasChanges } from '../src/diff.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import {
  EMPTY,
  lockfile,
  pkg,
  ROOT,
  ws,
} from './fixtures/lockfile.ts'
import type {
  GraphDiff,
  Mutation,
  MutationKind,
} from '../src/types.ts'

const kinds = (d: GraphDiff) => d.mutations.map(m => m.kind).sort()

const only = <K extends MutationKind>(d: GraphDiff, kind: K) =>
  d.mutations.filter(
    (m): m is Extract<Mutation, { kind: K }> => m.kind === kind,
  )

t.test('add and remove', async t => {
  const foo = pkg('foo', '1.0.0')
  const bar = pkg('bar', '1.0.0')
  const base = lockfile(
    [{ id: foo, name: 'foo' }],
    [{ from: ROOT, name: 'foo', to: foo }],
  )
  const head = lockfile(
    [{ id: bar, name: 'bar' }],
    [{ from: ROOT, name: 'bar', to: bar }],
  )
  const d = diffLockfiles(base, head)
  t.strictSame(kinds(d), [
    'edge-added',
    'edge-removed',
    'node-added',
    'node-removed',
  ])
  t.equal(
    only(d, 'node-added')[0]?.directness,
    'direct',
    'importer dep is direct',
  )
  t.equal(hasChanges(d), true)
})

t.test('upgrade, downgrade, sidegrade', async t => {
  const at = (v: string) => ({
    nodes: [{ id: pkg('foo', v), name: 'foo' }],
    edges: [{ from: ROOT, name: 'foo', to: pkg('foo', v) }],
  })
  const one = lockfile(at('1.0.0').nodes, at('1.0.0').edges)
  const two = lockfile(at('2.0.0').nodes, at('2.0.0').edges)
  t.equal(
    only(diffLockfiles(one, two), 'package-resolved')[0]?.direction,
    'upgrade',
  )
  t.equal(
    only(diffLockfiles(two, one), 'package-resolved')[0]?.direction,
    'downgrade',
  )

  // a git id has no parseable version, so direction is unknowable
  const g = pkg('foo', '1.0.0')
  const same = lockfile([{ id: g, name: 'foo' }], [])
  const other = lockfile([{ id: pkg('foo', 'x'), name: 'foo' }], [])
  t.equal(
    only(diffLockfiles(same, other), 'package-resolved')[0]
      ?.direction,
    'sidegrade',
    'unparseable version is a sidegrade, never a throw',
  )
})

t.test('same id, changed payload', async t => {
  const foo = pkg('foo', '1.0.0')
  const base = lockfile(
    [{ id: foo, name: 'foo', integrity: 'sha512-a' }],
    [],
  )
  const head = lockfile(
    [{ id: foo, name: 'foo', integrity: 'sha512-b' }],
    [],
  )
  const d = diffLockfiles(base, head)
  t.strictSame(kinds(d), ['node-changed'])
  t.strictSame(only(d, 'node-changed')[0]?.fields, ['integrity'])
})

t.test(
  'platform only compared when optional on both sides',
  async t => {
    const foo = pkg('foo', '1.0.0')
    // save() writes platform only for optional nodes, so an optionality
    // flip drops it without the platform actually changing
    const base = lockfile(
      [
        {
          id: foo,
          name: 'foo',
          flags: 1,
          platform: { os: ['linux'] },
        },
      ],
      [],
    )
    const head = lockfile([{ id: foo, name: 'foo', flags: 0 }], [])
    const d = diffLockfiles(base, head)
    t.strictSame(
      only(d, 'node-changed')[0]?.fields,
      ['optional'],
      'the optionality flip is reported, the phantom platform loss is not',
    )
  },
)

t.test(
  'registry migration is one mutation, not one per node',
  async t => {
    const nodes = (registry: string) =>
      ['a', 'b', 'c'].map(n => ({
        id: pkg(n, '1.0.0', undefined, registry),
        name: n,
        resolved: `https://${registry}.example/${n}.tgz`,
      }))
    const base = lockfile(nodes('npm'), [], {
      registry: 'https://npm.example',
    })
    const head = lockfile(nodes('vlt'), [], {
      registry: 'https://vlt.example',
    })
    const d = diffLockfiles(base, head)
    t.strictSame(kinds(d), [
      'node-identity-changed',
      'node-identity-changed',
      'node-identity-changed',
      'options-changed',
    ])
    t.strictSame(only(d, 'options-changed')[0]?.fields, ['registry'])
    t.strictSame(
      d.regions.flatMap(r => r.mutationIds).sort(),
      d.mutations.map(m => m.id).sort(),
      'an options change names no node but is still filed in a region',
    )
    for (const m of only(d, 'node-identity-changed')) {
      t.equal(m.reason, 'registry')
      t.equal(m.identityOnly, true, 'collapsed as noise by default')
    }
    t.equal(d.summary.identityOnly, 3)

    // opting in compares `resolved` even across registries
    const strict = diffLockfiles(base, head, {
      compareResolvedAcrossRegistries: true,
    })
    t.equal(only(strict, 'node-changed').length, 3)
  },
)

t.test('peer-set identity change', async t => {
  const base = lockfile(
    [{ id: pkg('foo', '1.0.0', '~peer.1'), name: 'foo' }],
    [],
  )
  const head = lockfile(
    [{ id: pkg('foo', '1.0.0', '~peer.9'), name: 'foo' }],
    [],
  )
  const d = diffLockfiles(base, head)
  t.strictSame(kinds(d), ['node-identity-changed'])
  t.equal(only(d, 'node-identity-changed')[0]?.reason, 'peer-set')
})

t.test(
  'identity match that also changed payload is not identity-only',
  async t => {
    const base = lockfile(
      [
        {
          id: pkg('foo', '1.0.0', '~peer.1'),
          name: 'foo',
          integrity: 'sha512-a',
        },
      ],
      [],
    )
    const head = lockfile(
      [
        {
          id: pkg('foo', '1.0.0', '~peer.9'),
          name: 'foo',
          integrity: 'sha512-b',
        },
      ],
      [],
    )
    const d = diffLockfiles(base, head)
    t.strictSame(kinds(d), ['node-changed'])
    t.equal(d.summary.identityOnly, 0)
  },
)

t.test(
  'N:M peer variants regroup rather than fabricate pairs',
  async t => {
    // every variant shares an integrity by construction, so it rides on
    // the mutation once rather than being repeated per variant
    const sha = 'sha512-shared'
    const one = lockfile(
      [
        {
          id: pkg('foo', '1.0.0', '~peer.1'),
          name: 'foo',
          integrity: sha,
        },
      ],
      [],
    )
    const two = lockfile(
      [
        {
          id: pkg('foo', '1.0.0', '~peer.2'),
          name: 'foo',
          integrity: sha,
        },
        {
          id: pkg('foo', '1.0.0', '~peer.3'),
          name: 'foo',
          integrity: sha,
        },
      ],
      [],
    )
    for (const [base, head, from, to] of [
      [one, two, 1, 2],
      [two, one, 2, 1],
    ] as const) {
      const d = diffLockfiles(base, head)
      t.strictSame(kinds(d), ['peer-variants-regrouped'])
      const m = only(d, 'peer-variants-regrouped')[0]
      t.equal(m?.from.length, from)
      t.equal(m?.to.length, to)
      t.equal(m?.version, '1.0.0')
      t.equal(m?.identityOnly, true)
      t.equal(typeof m?.from[0], 'string', 'ids, not whole nodes')
      t.equal(m?.integrity, sha, 'carried once, not per variant')
    }
  },
)

t.test(
  'N:M same-name buckets pair positionally by version',
  async t => {
    const base = lockfile(
      [
        { id: pkg('foo', '3.0.0'), name: 'foo' },
        { id: pkg('foo', '1.0.0'), name: 'foo' },
      ],
      [],
    )
    const head = lockfile(
      [
        { id: pkg('foo', '2.0.0'), name: 'foo' },
        { id: pkg('foo', '4.0.0'), name: 'foo' },
        { id: pkg('foo', '5.0.0'), name: 'foo' },
      ],
      [],
    )
    const d = diffLockfiles(base, head)
    // sorted ascending on each side, then paired by index
    t.strictSame(
      only(d, 'package-resolved').map(m => [
        m.from.version,
        m.to.version,
      ]),
      [
        ['1.0.0', '2.0.0'],
        ['3.0.0', '4.0.0'],
      ],
    )
    t.strictSame(
      only(d, 'node-added').map(m => m.node.version),
      ['5.0.0'],
      'the odd one out is an addition, not a fabricated pairing',
    )
  },
)

t.test(
  'edge slots under a moved parent are not double-counted',
  async t => {
    const oldFoo = pkg('foo', '1.0.0')
    const newFoo = pkg('foo', '2.0.0')
    const bar = pkg('bar', '1.0.0')
    const base = lockfile(
      [
        { id: oldFoo, name: 'foo' },
        { id: bar, name: 'bar' },
      ],
      [
        { from: ROOT, name: 'foo', to: oldFoo },
        { from: oldFoo, name: 'bar', to: bar },
      ],
    )
    const head = lockfile(
      [
        { id: newFoo, name: 'foo' },
        { id: bar, name: 'bar' },
      ],
      [
        { from: ROOT, name: 'foo', to: newFoo },
        { from: newFoo, name: 'bar', to: bar },
      ],
    )
    const d = diffLockfiles(base, head)
    t.strictSame(
      kinds(d),
      ['package-resolved'],
      'the bump is reported once; foo -> bar moving with it is not news',
    )
  },
)

t.test('edge retarget, respecify, added, removed', async t => {
  const app = pkg('app', '1.0.0')
  const a = pkg('a', '1.0.0')
  const b = pkg('b', '1.0.0')
  const nodes = [
    { id: app, name: 'app' },
    { id: a, name: 'a' },
    { id: b, name: 'b' },
  ]
  const base = lockfile(nodes, [
    { from: ROOT, name: 'app', to: app },
    { from: app, name: 'dep', spec: '^1', to: a },
    { from: app, name: 'gone', to: b },
  ])
  const head = lockfile(nodes, [
    { from: ROOT, name: 'app', to: app },
    { from: app, name: 'dep', spec: '^1', to: b },
    { from: app, name: 'fresh', to: b },
  ])
  const d = diffLockfiles(base, head)
  t.strictSame(kinds(d), [
    'edge-added',
    'edge-removed',
    'edge-retargeted',
  ])
  t.match(only(d, 'edge-retargeted')[0], {
    from: { to: a },
    to: { to: b },
  })

  // spec and type changes are invisible to the graph's own Diff class
  const respec = diffLockfiles(
    base,
    lockfile(nodes, [
      { from: ROOT, name: 'app', to: app },
      { from: app, name: 'dep', type: 'dev', spec: '^2', to: a },
      { from: app, name: 'gone', to: b },
    ]),
  )
  t.strictSame(only(respec, 'edge-respecified')[0]?.fields, [
    'spec',
    'type',
  ])
})

t.test(
  'retarget explained by a reported node move is suppressed',
  async t => {
    const app = pkg('app', '1.0.0')
    const base = lockfile(
      [
        { id: app, name: 'app' },
        { id: pkg('dep', '1.0.0'), name: 'dep' },
      ],
      [
        { from: ROOT, name: 'app', to: app },
        { from: app, name: 'dep', to: pkg('dep', '1.0.0') },
      ],
    )
    const head = lockfile(
      [
        { id: app, name: 'app' },
        { id: pkg('dep', '2.0.0'), name: 'dep' },
      ],
      [
        { from: ROOT, name: 'app', to: app },
        { from: app, name: 'dep', to: pkg('dep', '2.0.0') },
      ],
    )
    t.strictSame(
      kinds(diffLockfiles(base, head)),
      ['package-resolved'],
      'app -> dep following the bump adds nothing',
    )
  },
)

t.test('MISSING targets both directions', async t => {
  const app = pkg('app', '1.0.0')
  const b = pkg('b', '1.0.0')
  const withMissing = lockfile(
    [
      { id: app, name: 'app' },
      { id: b, name: 'b' },
    ],
    [{ from: app, name: 'p', type: 'peerOptional', to: 'MISSING' }],
  )
  const withTarget = lockfile(
    [
      { id: app, name: 'app' },
      { id: b, name: 'b' },
    ],
    [{ from: app, name: 'p', type: 'peerOptional', to: b }],
  )
  for (const [base, head] of [
    [withMissing, withTarget],
    [withTarget, withMissing],
  ] as const) {
    const d = diffLockfiles(base, head)
    t.strictSame(kinds(d), ['edge-retargeted'])
    t.equal(
      only(d, 'edge-retargeted')[0]?.identityOnly,
      false,
      'a MISSING on either side is a real retarget',
    )
  }
})

t.test('cycles do not hang the region walk', async t => {
  const a = pkg('a', '1.0.0')
  const b = pkg('b', '1.0.0')
  const nodes = (v: string) => [
    { id: a, name: 'a' },
    { id: b, name: 'b' },
    { id: pkg('c', v), name: 'c' },
  ]
  const edges = (v: string) => [
    { from: ROOT, name: 'a', to: a },
    { from: a, name: 'b', to: b },
    { from: b, name: 'a', to: a },
    { from: b, name: 'c', to: pkg('c', v) },
  ]
  const d = diffLockfiles(
    lockfile(nodes('1.0.0'), edges('1.0.0')),
    lockfile(nodes('2.0.0'), edges('2.0.0')),
  )
  t.strictSame(kinds(d), ['package-resolved'])
  t.equal(d.regions.length, 1)
  t.strictSame(d.regions[0]?.importers, [ROOT])
})

t.test('empty base and empty head', async t => {
  const foo = pkg('foo', '1.0.0')
  const some = lockfile(
    [{ id: foo, name: 'foo' }],
    [{ from: ROOT, name: 'foo', to: foo }],
  )
  // the importer itself is new, so its edges are implied by the added
  // nodes rather than reported a second time
  t.strictSame(kinds(diffLockfiles(EMPTY, some)), ['node-added'])
  t.strictSame(kinds(diffLockfiles(some, EMPTY)), ['node-removed'])
  const none = diffLockfiles(EMPTY, EMPTY)
  t.strictSame(none.mutations, [])
  t.equal(hasChanges(none), false)
  t.strictSame(none.summary.counts, {})
})

t.test('regions partition the mutations', async t => {
  const shared = pkg('shared', '1.0.0')
  const docsOnly = pkg('docs-only', '1.0.0')
  const bump = (v: string) => [
    { id: pkg('shared', v), name: 'shared' },
    { id: pkg('docs-only', v), name: 'docs-only' },
  ]
  const edges = (v: string) => [
    { from: ROOT, name: 'shared', to: pkg('shared', v) },
    { from: ws('www/docs'), name: 'shared', to: pkg('shared', v) },
    {
      from: ws('www/docs'),
      name: 'docs-only',
      to: pkg('docs-only', v),
    },
  ]
  const d = diffLockfiles(
    lockfile(bump('1.0.0'), edges('1.0.0')),
    lockfile(bump('2.0.0'), edges('2.0.0')),
  )
  t.equal(shared !== docsOnly, true)

  t.strictSame(
    d.regions.flatMap(r => r.mutationIds).sort(),
    d.mutations.map(m => m.id).sort(),
    'every mutation lands in exactly one region',
  )
  t.strictSame(
    d.regions.map(r => r.label).sort(),
    ['shared by 2 workspaces', 'www/docs'],
    'a dep two workspaces pull in is one shared region, not two copies',
  )
  t.equal(d.summary.regions, 2)
})

t.test('a node nothing reaches any more still reports', async t => {
  const orphan = pkg('orphan', '1.0.0')
  const d = diffLockfiles(
    lockfile([{ id: orphan, name: 'orphan' }], []),
    EMPTY,
  )
  t.strictSame(kinds(d), ['node-removed'])
  t.equal(d.regions[0]?.label, 'unreachable')
  t.strictSame(d.regions[0]?.importers, [])
})

t.test('summary counts', async t => {
  const foo = pkg('foo', '1.0.0')
  const d = diffLockfiles(
    lockfile(
      [{ id: foo, name: 'foo' }],
      [{ from: ROOT, name: 'foo', to: foo }],
    ),
    lockfile(
      [{ id: pkg('foo', '2.0.0'), name: 'foo' }],
      [{ from: ROOT, name: 'foo', to: pkg('foo', '2.0.0') }],
    ),
  )
  t.strictSame(
    d.summary.nodes,
    { base: 1, head: 1 },
    'importers excluded',
  )
  t.strictSame(d.summary.edges, { base: 1, head: 1 })
  t.equal(d.schemaVersion, 1)
  t.strictSame(
    JSON.parse(JSON.stringify(d)),
    d,
    'the model is plain data: JSON.stringify is the whole serializer',
  )
})

t.test('version comparison corner cases', async t => {
  // build metadata is not precedence-bearing, so the versions compare
  // equal while the ids differ
  const d = diffLockfiles(
    lockfile([{ id: pkg('foo', '1.0.0'), name: 'foo' }], []),
    lockfile([{ id: pkg('foo', '1.0.0+build'), name: 'foo' }], []),
  )
  t.equal(only(d, 'package-resolved')[0]?.direction, 'sidegrade')

  // an N:M bucket where no side parses falls back to string ordering
  const messy = diffLockfiles(
    lockfile(
      [
        { id: pkg('foo', 'zeta'), name: 'foo' },
        { id: pkg('foo', 'alpha'), name: 'foo' },
      ],
      [],
    ),
    lockfile(
      [
        { id: pkg('foo', 'beta'), name: 'foo' },
        { id: pkg('foo', 'yankee'), name: 'foo' },
      ],
      [],
    ),
  )
  t.strictSame(
    only(messy, 'package-resolved').map(m => [
      m.from.version,
      m.to.version,
    ]),
    [
      ['alpha', 'beta'],
      ['zeta', 'yankee'],
    ],
    'unparseable versions sort as strings rather than throwing',
  )

  // more on the base side than the head side
  const shrink = diffLockfiles(
    lockfile(
      [
        { id: pkg('foo', '1.0.0'), name: 'foo' },
        { id: pkg('foo', '2.0.0'), name: 'foo' },
      ],
      [],
    ),
    lockfile([{ id: pkg('foo', '3.0.0'), name: 'foo' }], []),
  )
  t.strictSame(
    only(shrink, 'node-removed').map(m => m.node.version),
    ['2.0.0'],
  )
})

t.test('a modifier is its own identity reason', async t => {
  const d = diffLockfiles(
    lockfile([{ id: pkg('foo', '1.0.0'), name: 'foo' }], []),
    lockfile(
      [{ id: pkg('foo', '1.0.0', ':root > #foo'), name: 'foo' }],
      [],
    ),
  )
  t.equal(only(d, 'node-identity-changed')[0]?.reason, 'modifier')
})

t.test('platform compared when optional on both sides', async t => {
  const foo = pkg('foo', '1.0.0')
  const d = diffLockfiles(
    lockfile(
      [
        {
          id: foo,
          name: 'foo',
          flags: 1,
          platform: { os: ['linux'] },
        },
      ],
      [],
    ),
    lockfile(
      [
        {
          id: foo,
          name: 'foo',
          flags: 1,
          platform: { os: ['darwin'] },
        },
      ],
      [],
    ),
  )
  t.strictSame(only(d, 'node-changed')[0]?.fields, ['platform'])
})

t.test('peer variants on an id that carries no version', async t => {
  const git = (extra: string) =>
    joinDepIDTuple(['git', 'github:a/b', 'main', extra])
  const d = diffLockfiles(
    lockfile([{ id: git('peer.1'), name: 'b' }], []),
    lockfile(
      [
        { id: git('peer.2'), name: 'b' },
        { id: git('peer.3'), name: 'b' },
      ],
      [],
    ),
  )
  const m = only(d, 'peer-variants-regrouped')[0]
  t.equal(
    m?.version,
    undefined,
    'no version key when the id has none',
  )
  t.notOk('version' in (m ?? {}))
})

t.test('a name bucket of ids that carry no version', async t => {
  // git ids have no version, so the bucket sorts on the raw ref string
  const git = (ref: string) =>
    joinDepIDTuple(['git', 'github:a/b', ref])
  const d = diffLockfiles(
    lockfile(
      [
        { id: git('v3'), name: 'b' },
        { id: git('v1'), name: 'b' },
      ],
      [],
    ),
    lockfile(
      [
        { id: git('v4'), name: 'b' },
        { id: git('v2'), name: 'b' },
      ],
      [],
    ),
  )
  t.strictSame(
    only(d, 'package-resolved').map(m => m.direction),
    ['sidegrade', 'sidegrade'],
    'no version means no direction can be claimed',
  )
})

t.test('every mutation carries the base fields', async t => {
  const foo = pkg('foo', '1.0.0')
  const d = diffLockfiles(
    lockfile([{ id: foo, name: 'foo' }], []),
    lockfile([{ id: pkg('foo', '2.0.0'), name: 'foo' }], []),
  )
  for (const m of d.mutations) {
    // absent keys would leave consumers guessing whether false or
    // unknown was meant, and this is the published contract
    t.type(m.identityOnly, 'boolean', `${m.kind} identityOnly`)
    t.type(m.alsoReachedBy, 'number', `${m.kind} alsoReachedBy`)
    t.type(m.directness, 'string', `${m.kind} directness`)
  }
})

t.test(
  'a change reached from further away than its region says',
  async t => {
    const shared = pkg('shared', '1.0.0')
    const mid = pkg('mid', '1.0.0')
    // near/shared is one hop; far/mid/shared is two, so the region keys on
    // `near` alone and would otherwise report this as near-only
    const at = (v: string) => [
      { id: pkg('shared', v), name: 'shared' },
      { id: mid, name: 'mid' },
    ]
    const edges = (v: string) => [
      { from: ws('near'), name: 'shared', to: pkg('shared', v) },
      { from: ws('far'), name: 'mid', to: mid },
      { from: mid, name: 'shared', to: pkg('shared', v) },
    ]
    const d = diffLockfiles(
      lockfile(at('1.0.0'), edges('1.0.0')),
      lockfile(at('2.0.0'), edges('2.0.0')),
    )
    t.equal(shared !== mid, true)
    const m = only(d, 'package-resolved')[0]
    t.strictSame(
      d.regions[0]?.importers,
      [ws('near')],
      'filed under the nearest',
    )
    t.equal(
      m?.alsoReachedBy,
      1,
      'but far reaches it too, and says so',
    )
  },
)

t.test('severity says how far the version moved', async t => {
  const at = (v: string) =>
    lockfile([{ id: pkg('foo', v), name: 'foo' }], [])
  const move = (a: string, b: string) =>
    only(diffLockfiles(at(a), at(b)), 'package-resolved')[0]

  t.equal(move('1.0.0', '2.0.0')?.severity, 'major')
  t.equal(move('1.0.0', '1.1.0')?.severity, 'minor')
  t.equal(move('1.0.0', '1.0.1')?.severity, 'patch')
  t.equal(
    move('1.0.0', '1.0.0-beta.1')?.severity,
    'prerelease',
    'same x.y.z, so only the prerelease moved',
  )
  t.equal(
    move('1.0.0', 'x')?.severity,
    'unknown',
    'an unparseable version is never guessed at',
  )

  // severity and direction are orthogonal: a downgrade can be major
  const down = move('2.0.0', '1.0.0')
  t.equal(down?.severity, 'major')
  t.equal(down?.direction, 'downgrade')
})
