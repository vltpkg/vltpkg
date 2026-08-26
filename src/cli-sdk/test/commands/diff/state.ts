import t from 'tap'
import {
  flatten,
  initialState,
  layout,
  nameOf,
  reduce,
  selected,
  triage,
  visibleMutations,
  visibleRegions,
  windowed,
} from '../../../src/commands/diff/state.ts'
import type {
  Event,
  State,
  TreeRow,
} from '../../../src/commands/diff/state.ts'
import type { GraphDiff, Mutation } from '@vltpkg/graph-diff'

const node = (name: string, version: string) =>
  ({ id: `~npm~${name}@${version}`, name, version }) as never

const mut = (m: Partial<Mutation> & { id: string }): Mutation =>
  ({
    kind: 'node-added',
    directness: 'transitive',
    identityOnly: false,
    alsoReachedBy: 0,
    node: node('thing', '1.0.0'),
    ...m,
  }) as Mutation

const resolved = (
  id: string,
  name: string,
  from: string,
  to: string,
  extra: Record<string, unknown> = {},
): Mutation =>
  mut({
    id,
    kind: 'package-resolved',
    name,
    from: node(name, from),
    to: node(name, to),
    direction: 'upgrade',
    severity: 'patch',
    ...extra,
  })

/**
 * Two regions: one holding real changes plus a piece of noise, one
 * holding nothing but noise, so it disappears when identity is off.
 */
const diff = {
  summary: {},
  mutations: [
    // alpha came in through beta, which is the direct dependency
    resolved('real-a', 'alpha', '1.0.0', '1.0.1', {
      via: { id: '~npm~beta@1.1.0', name: 'beta' },
    }),
    resolved('real-b', 'beta', '1.0.0', '1.1.0', {
      directness: 'direct',
    }),
    mut({ id: 'noise-a', identityOnly: true }),
    mut({ id: 'noise-b', identityOnly: true }),
  ],
  regions: [
    {
      id: 'r1',
      label: 'www/docs',
      importers: ['workspace~www+docs'],
      nodes: [],
      mutationIds: ['real-a', 'real-b', 'noise-a'],
    },
    {
      id: 'r2',
      label: 'quiet',
      importers: [],
      nodes: [],
      mutationIds: ['noise-b'],
    },
  ],
} as unknown as GraphDiff

const empty = {
  summary: {},
  mutations: [],
  regions: [],
} as unknown as GraphDiff

const OFF = { identity: false, directOnly: false }
const ON = { identity: true, directOnly: false }

const run = (events: Event[], from: State = initialState, d = diff) =>
  events.reduce((s, e) => reduce(s, e, d), from)

t.test(
  'layout budgets a frame to exactly the rows given',
  async t => {
    // header + body + footer must come to rows, or the frame scrolls
    for (const rows of [10, 24, 60]) {
      const { body, list } = layout(rows)
      t.equal(1 + body + 1, rows, `${rows} rows`)
      t.equal(
        list,
        body - 2,
        'each pane spends two rows on its border',
      )
    }
    // a terminal too short for the chrome still yields a usable budget
    t.equal(layout(1).body, 1)
    t.equal(layout(1).list, 1)
  },
)

t.test('windowed keeps the cursor in view', async t => {
  const items = Array.from({ length: 10 }, (_, i) => i)
  t.strictSame(
    windowed(items, 0, 4).slice,
    [0, 1, 2, 3],
    'at the top',
  )
  t.equal(windowed(items, 0, 4).more, 6)
  t.strictSame(
    windowed(items, 9, 4).slice,
    [6, 7, 8, 9],
    'at the bottom, without running past the end',
  )
  t.equal(windowed(items, 9, 4).more, 0)
  t.strictSame(windowed(items, 5, 4).slice, [3, 4, 5, 6], 'centred')

  // small terminals hit this constantly now that size is dynamic
  t.strictSame(windowed([1, 2], 0, 8).slice, [1, 2], 'size > length')
  t.equal(windowed([1, 2], 0, 8).more, 0)
  t.equal(windowed([], 0, 4).start, 0, 'empty list')
})

t.test('triage leads with risk, then ownership', async t => {
  const { risky, yours, routine } = triage(diff)
  t.strictSame(
    risky.map(m => m.id),
    [],
    'a patch and a minor are not risky',
  )
  t.strictSame(
    yours.map(m => m.id),
    ['real-b'],
    'only the direct, non-identity change is yours',
  )
  t.strictSame(routine, [
    ['identity', 2],
    ['patch', 1],
  ])

  // a payload change is labelled by what it is, not by its kind
  const meta = {
    ...diff,
    mutations: [
      mut({
        id: 'meta',
        kind: 'node-changed',
        from: node('thing', '1.0.0'),
        to: node('thing', '1.0.0'),
        fields: ['dev'],
      }),
      mut({ id: 'edge', kind: 'edge-added', edge: {} as never }),
    ],
  } as GraphDiff
  t.strictSame(triage(meta).routine, [
    ['metadata', 1],
    ['edge-added', 1],
  ])
})

t.test('a major bump and a downgrade are risky', async t => {
  const d = {
    ...diff,
    mutations: [
      resolved('big', 'alpha', '1.0.0', '2.0.0', {
        severity: 'major',
      }),
      resolved('back', 'beta', '2.0.0', '1.9.0', {
        direction: 'downgrade',
        severity: 'minor',
      }),
    ],
  } as GraphDiff
  t.strictSame(
    triage(d).risky.map(m => m.id),
    ['big', 'back'],
    'severity and direction are independent signals',
  )
})

t.test('a dropped variant is not a removal', async t => {
  // pass 4's N:M pairing emits leftovers as node-removed, so a peer
  // variant going away looks identical to a package going away
  const d = {
    ...diff,
    mutations: [
      mut({
        id: 'variant',
        kind: 'node-removed',
        node: node('radix', '1.1.3'),
      }),
      resolved('still-here', 'radix', '1.1.3', '1.1.5'),
      mut({
        id: 'real',
        kind: 'node-removed',
        node: node('require-directory', '2.1.1'),
      }),
    ],
  } as GraphDiff
  t.strictSame(
    triage(d).risky.map(m => m.id),
    ['real'],
    'only the name that survives nowhere counts as dropped',
  )
})

t.test('every surviving-name source is consulted', async t => {
  // a name kept alive by a regroup or an identity change is equally
  // not a removal
  for (const alive of [
    mut({
      id: 'alive',
      kind: 'peer-variants-regrouped',
      name: 'thing',
      from: [],
      to: [],
    }),
    mut({
      id: 'alive',
      kind: 'node-identity-changed',
      from: node('thing', '1.0.0'),
      to: node('thing', '1.0.0'),
      reason: 'peer-set',
    }),
    mut({
      id: 'alive',
      kind: 'node-changed',
      from: node('thing', '1.0.0'),
      to: node('thing', '1.0.0'),
      fields: ['dev'],
    }),
  ]) {
    const d = {
      ...diff,
      mutations: [
        alive,
        mut({
          id: 'drop',
          kind: 'node-removed',
          node: node('thing', '0.9.0'),
        }),
      ],
    } as GraphDiff
    t.strictSame(triage(d).risky, [], alive.kind)
  }
})

t.test(
  'identity and direct filters change what is visible',
  async t => {
    t.strictSame(
      visibleRegions(diff, OFF).map(r => r.label),
      ['www/docs'],
      'a region holding only noise is hidden entirely',
    )
    t.strictSame(
      visibleRegions(diff, ON).map(r => r.label),
      ['www/docs', 'quiet'],
    )
    t.strictSame(
      visibleMutations(diff, diff.regions[0], OFF).map(m => m.id),
      ['real-a', 'real-b'],
    )
    t.strictSame(
      visibleMutations(diff, diff.regions[0], ON).map(m => m.id),
      ['real-a', 'real-b', 'noise-a'],
    )
    t.strictSame(
      visibleMutations(diff, diff.regions[0], {
        identity: false,
        directOnly: true,
      }).map(m => m.id),
      ['real-b'],
      'direct-only drops everything an importer did not ask for',
    )
    t.strictSame(visibleMutations(diff, undefined, ON), [])
  },
)

t.test(
  'flatten hangs transitives under their direct dep',
  async t => {
    const rows = flatten(diff, OFF)
    t.strictSame(
      rows.map((r: TreeRow) =>
        r.kind === 'change' ?
          `${'  '.repeat(r.depth)}${nameOf(r.mutation)}`
        : `${r.kind}:${r.label}`,
      ),
      ['area:www/docs', 'beta', '  alpha'],
      'the direct change is the root, the transitive nests under it',
    )
  },
)

t.test(
  'a puller with no change of its own gets a heading',
  async t => {
    const d = {
      ...diff,
      mutations: [
        resolved('kid', 'child', '1.0.0', '1.0.1', {
          via: { id: '~npm~puller@1.0.0', name: 'puller' },
        }),
      ],
      regions: [{ ...diff.regions[0], mutationIds: ['kid'] }],
    } as unknown as GraphDiff
    const rows = flatten(d, OFF)
    t.strictSame(
      rows.map((r: TreeRow) =>
        r.kind === 'change' ?
          `change:${nameOf(r.mutation)}`
        : `${r.kind}:${r.label}`,
      ),
      ['area:www/docs', 'group:puller', 'change:child'],
      'or its children would read as roots',
    )
  },
)

t.test('several changes share one direct dep', async t => {
  // the common shape in a real diff: one bump drags in a handful
  const via = { id: '~npm~beta@1.1.0', name: 'beta' }
  const d = {
    ...diff,
    mutations: [
      resolved('root', 'beta', '1.0.0', '1.1.0', {
        directness: 'direct',
      }),
      resolved('kid-a', 'alpha', '1.0.0', '1.0.1', { via }),
      resolved('kid-b', 'gamma', '1.0.0', '1.0.1', { via }),
    ],
    regions: [
      { ...diff.regions[0], mutationIds: ['root', 'kid-a', 'kid-b'] },
    ],
  } as unknown as GraphDiff
  t.strictSame(
    flatten(d, OFF).map((r: TreeRow) =>
      r.kind === 'change' ?
        `${'  '.repeat(r.depth)}${nameOf(r.mutation)}`
      : `${r.kind}:${r.label}`,
    ),
    ['area:www/docs', 'beta', '  alpha', '  gamma'],
    'both nest under the one that pulled them in',
  )
})

t.test('nameOf finds the package in every kind', async t => {
  const n = (m: Partial<Mutation> & { id: string }) => nameOf(mut(m))
  t.equal(n({ id: 'a', kind: 'node-added' }), 'thing')
  t.equal(
    n({
      id: 'b',
      kind: 'node-changed',
      from: node('x', '1.0.0'),
      to: node('x', '1.0.0'),
      fields: [],
    }),
    'x',
  )
  t.equal(n({ id: 'c', kind: 'package-resolved', name: 'y' }), 'y')
  t.equal(
    n({ id: 'd', kind: 'edge-added', edge: { name: 'z' } as never }),
    'z',
  )
  t.equal(
    n({
      id: 'e',
      kind: 'edge-retargeted',
      from: {} as never,
      to: { name: 'w' } as never,
    }),
    'w',
  )
  t.equal(
    n({ id: 'f', kind: 'options-changed', fields: [] }),
    'lockfile options',
    'a lockfile-level change names no package',
  )
})

t.test('selected only resolves on a change row', async t => {
  const rows = flatten(diff, OFF)
  t.equal(selected(rows, 0), undefined, 'an area heading')
  t.equal(selected(rows, 1)?.id, 'real-b')
  t.equal(selected(rows, 99), undefined, 'past the end')
})

t.test('descending and coming back up', async t => {
  const browse = run(['Select'])
  t.equal(browse.screen, 'browse')
  t.equal(browse.cursor, 0, 'lands on the first row')
  t.equal(
    run(['Select'], browse).screen,
    'browse',
    'a heading is not something to open',
  )

  const detail = run(['MoveNext', 'Select'], browse)
  t.equal(detail.screen, 'detail')
  t.equal(run(['Back'], detail).screen, 'browse')
  t.equal(run(['Back', 'Back'], detail).screen, 'summary')
  t.equal(
    run(['Back', 'Back', 'Back'], detail).screen,
    'summary',
    'quitting is an effect, not a state, so back bottoms out here',
  )
  t.equal(
    run(['Select'], { ...initialState, screen: 'detail' }).screen,
    'detail',
    'the detail screen is the bottom',
  )
})

t.test('the cursor walks the whole tree and clamps', async t => {
  const browse = run(['Select'])
  t.equal(
    run(['MovePrevious'], browse).cursor,
    0,
    'no wrap backwards',
  )
  t.equal(run(['MoveNext'], browse).cursor, 1)
  t.equal(
    run(['MoveNext', 'MoveNext', 'MoveNext', 'MoveNext'], browse)
      .cursor,
    2,
    'clamps at the last row',
  )
})

t.test(
  'select does nothing when there is nothing to select',
  async t => {
    t.strictSame(
      reduce(initialState, 'Select', empty),
      initialState,
      'an empty diff has no region to descend into',
    )
    const browse = { ...initialState, screen: 'browse' as const }
    t.strictSame(
      reduce(browse, 'Select', empty),
      browse,
      'and no change to open',
    )
  },
)

t.test('toggling a filter re-clamps the cursor', async t => {
  // with identity on there are more rows; park the cursor past where
  // the tree ends once it is off again
  const deep = run(
    ['ToggleIdentity', 'Select', 'MoveNext', 'MoveNext', 'MoveNext'],
    initialState,
  )
  t.equal(deep.cursor, 3)
  t.ok(flatten(diff, ON).length > flatten(diff, OFF).length)

  const off = reduce(deep, 'ToggleIdentity', diff)
  t.equal(off.identity, false)
  t.equal(
    off.cursor,
    flatten(diff, OFF).length - 1,
    'the rows it pointed past are gone, so it clamps back',
  )

  const direct = reduce(initialState, 'ToggleDirect', diff)
  t.equal(direct.directOnly, true)
  t.equal(reduce(direct, 'ToggleDirect', diff).directOnly, false)
})

t.test(
  'toggling to nothing visible returns to the summary',
  async t => {
    const onlyNoise = {
      summary: {},
      mutations: [mut({ id: 'noise', identityOnly: true })],
      regions: [
        {
          id: 'r',
          label: 'quiet',
          importers: [],
          nodes: [],
          mutationIds: ['noise'],
        },
      ],
    } as unknown as GraphDiff

    // Select enters browse on the area heading, so step onto the
    // change before opening it
    const deep = run(
      ['ToggleIdentity', 'Select', 'MoveNext', 'Select'],
      initialState,
      onlyNoise,
    )
    t.equal(deep.screen, 'detail')
    t.equal(
      reduce(deep, 'ToggleIdentity', onlyNoise).screen,
      'summary',
      'never strand the reader on a screen with nothing on it',
    )
  },
)

t.test('clamping an empty tree stays at zero', async t => {
  t.equal(reduce(initialState, 'MoveNext', empty).cursor, 0)
  t.equal(
    reduce(
      { ...initialState, screen: 'browse' },
      'MovePrevious',
      empty,
    ).cursor,
    0,
  )
})
