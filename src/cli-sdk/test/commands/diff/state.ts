import t from 'tap'
import {
  alertCount,
  alertGroups,
  alertRows,
  alertsFor,
  highlights,
  initialState,
  layout,
  locate,
  nameOf,
  nodeIdOf,
  reduce,
  searchHits,
  selectable,
  summaryCursor,
  summaryRows,
  treeLines,
  treeSize,
  treesOf,
  view,
  visibleMutations,
  visibleRegions,
  windowed,
  workspacesFor,
  workspacesOf,
} from '../../../src/commands/diff/state.ts'
import type {
  Event,
  State,
  SummaryRow,
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
      path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
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

/** A cursor parked on the first row of a given kind. */
const at = (
  kind: SummaryRow['kind'],
  d = diff,
  from: State = initialState,
): State => ({
  ...from,
  summaryIndex: summaryRows(d, from).findIndex(r => r.kind === kind),
})

const IDENTITY: State = { ...initialState, identity: true }

// the summary leads with what changed, so getting to the workspace
// browser means walking past it
const run = (
  events: Event[],
  from: State = at('workspace'),
  d = diff,
) => events.reduce((s, e) => reduce(s, e, d), from)

t.test(
  'layout budgets a frame to exactly the rows given',
  async t => {
    // header + body + footer must come to rows, or the frame scrolls
    for (const rows of [10, 24, 60]) {
      t.equal(1 + layout(rows).body + 1, rows, `${rows} rows`)
    }
    t.equal(
      layout(1).body,
      1,
      'a terminal too short still gives a row',
    )
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

t.test('highlights name exactly what they hold', async t => {
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
      mut({
        id: 'gone',
        kind: 'node-removed',
        node: node('require-directory', '2.1.1'),
      }),
      resolved('dull', 'gamma', '1.0.0', '1.0.1'),
    ],
  } as GraphDiff
  const h = highlights(d)
  t.strictSame(
    h.major.map(m => m.id),
    ['big'],
  )
  t.strictSame(
    h.downgraded.map(m => m.id),
    ['back'],
  )
  t.strictSame(
    h.removed.map(m => m.id),
    ['gone'],
  )
  t.strictSame(
    h.added.map(m => m.id),
    [],
    'nothing arrived that was not already there',
  )
  t.strictSame(
    h.upgraded.map(m => m.id),
    ['dull'],
    'a patch bump is still a bump, it just is not a headline',
  )
  t.strictSame(
    h.edges.map(m => m.id),
    [],
  )

  const quiet = highlights({
    ...diff,
    mutations: [],
  })
  t.strictSame(
    Object.values(quiet).flat(),
    [],
    'an empty diff highlights nothing, so every section is dropped',
  )
})

t.test('what arrived, and what merely moved', async t => {
  const d = {
    ...diff,
    mutations: [
      mut({
        id: 'new',
        kind: 'node-added',
        node: node('brand', '1.0.0'),
      }),
      // beta is bumped, so a node-added for it is a peer variant
      // arriving under a new id rather than a package arriving
      mut({
        id: 'variant',
        kind: 'node-added',
        node: node('beta', '1.1.0'),
      }),
      resolved('real-b', 'beta', '1.0.0', '1.1.0'),
      mut({
        id: 'edge',
        kind: 'edge-added',
        edge: { name: 'z', spec: '^1', type: 'prod' } as never,
      }),
    ],
  }
  const h = highlights(d)
  t.strictSame(
    h.added.map(m => m.id),
    ['new'],
    'the mirror of a dropped variant is not an addition',
  )
  t.strictSame(
    h.edges.map(m => m.id),
    ['edge'],
    'who points at what, rather than what is in the graph',
  )
})

t.test('a major downgrade counts once, as a downgrade', async t => {
  const d = {
    ...diff,
    mutations: [
      resolved('back', 'alpha', '2.0.0', '1.0.0', {
        direction: 'downgrade',
        severity: 'major',
      }),
    ],
  } as GraphDiff
  const h = highlights(d)
  t.strictSame(
    h.downgraded.map(m => m.id),
    ['back'],
  )
  t.strictSame(h.major, [], 'or it would appear in two sections')
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
    highlights(d).removed.map(m => m.id),
    ['real'],
    'only the name that survives nowhere counts as dropped',
  )

  // a name kept alive by a metadata or identity change is equally not
  // a removal, so every source of a surviving name has to be consulted
  for (const alive of [
    mut({
      id: 'alive',
      kind: 'node-changed',
      from: node('kept', '1.0.0'),
      to: node('kept', '1.0.0'),
      fields: ['dev'],
    }),
    mut({
      id: 'alive',
      kind: 'node-identity-changed',
      from: node('kept', '1.0.0'),
      to: node('kept', '1.0.0'),
      reason: 'peer-set',
    }),
    mut({
      id: 'alive',
      kind: 'peer-variants-regrouped',
      name: 'kept',
      from: [],
      to: [],
    }),
  ]) {
    const kept = {
      ...diff,
      mutations: [
        alive,
        mut({
          id: 'drop',
          kind: 'node-removed',
          node: node('kept', '0.9.0'),
        }),
      ],
    } as GraphDiff
    t.strictSame(highlights(kept).removed, [], alive.kind)
  }
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

t.test(
  'trees group by the direct dependency at the head of the path',
  async t => {
    const trees = treesOf(
      visibleMutations(diff, diff.regions[0], OFF),
    )
    t.strictSame(
      trees.map(x => x.name),
      ['beta'],
    )
    t.equal(
      trees[0]?.root?.id,
      'real-b',
      'the direct dep changed too',
    )
    t.strictSame(
      trees[0]?.changes.map(m => m.id),
      ['real-a'],
    )
    t.equal(treeSize(trees[0] as never), 2, 'its own change counts')
    t.strictSame(treesOf([]), [], 'nothing to group')

    // same size, so the tie breaks on name
    t.strictSame(
      treesOf([
        resolved('b', 'zeta', '1.0.0', '1.0.1'),
        resolved('a', 'alpha', '1.0.0', '1.0.1'),
      ]).map(x => x.name),
      ['alpha', 'zeta'],
    )
  },
)

t.test(
  'a puller that did not change itself still heads a tree',
  async t => {
    const d = {
      ...diff,
      mutations: [
        resolved('kid', 'child', '1.0.0', '1.0.1', {
          path: [{ id: '~npm~puller@1.0.0', name: 'puller' }],
        }),
      ],
      regions: [{ ...diff.regions[0], mutationIds: ['kid'] }],
    } as unknown as GraphDiff
    const [tree] = treesOf(visibleMutations(d, d.regions[0], OFF))
    t.equal(tree?.name, 'puller')
    t.equal(tree?.root, undefined, 'it has no change of its own')
    t.equal(treeSize(tree as never), 1)
  },
)

t.test(
  'treeLines draws the shape with box-drawing prefixes',
  async t => {
    const step = (name: string) => ({
      id: `~npm~${name}@1.0.0`,
      name,
    })
    const tree = {
      key: 'astro',
      name: 'astro',
      root: resolved('root', 'astro', '1.0.0', '2.0.0'),
      changes: [
        // two siblings under one intermediate, plus a deeper one, so the
        // vertical and both corner pieces all appear
        resolved('a', 'ansi-regex', '1.0.0', '1.0.1', {
          path: [step('astro'), step('boxen'), step('strip-ansi')],
        }),
        resolved('b', 'wrap-ansi', '1.0.0', '1.0.1', {
          path: [step('astro'), step('boxen')],
        }),
        resolved('c', 'zod', '1.0.0', '1.0.1', {
          path: [step('astro')],
        }),
      ],
    }
    t.strictSame(
      treeLines(tree as never).map(l => `${l.prefix}${l.name}`),
      [
        'astro',
        '├─ boxen',
        '│  ├─ strip-ansi',
        '│  │  └─ ansi-regex',
        '│  └─ wrap-ansi',
        '└─ zod',
      ],
    )
    t.equal(
      treeLines(tree as never).find(l => l.name === 'boxen')
        ?.mutation,
      undefined,
      'boxen never changed; it is on the route, shown for context',
    )
    t.equal(
      treeLines(tree as never)[0]?.mutation?.id,
      'root',
      'the root carries its own change when it has one',
    )

    // treesOf never builds one this way, but treeLines is exported and a
    // change with no route still has to land somewhere
    t.strictSame(
      treeLines({
        key: 'x',
        name: 'x',
        changes: [resolved('loose', 'loose', '1.0.0', '1.0.1')],
      }).map(l => `${l.prefix}${l.name}`),
      ['x', '└─ loose'],
      'directly under the root',
    )
  },
)

t.test('descending narrows, back widens', async t => {
  const ws = run(['Select'])
  t.equal(ws.screen, 'workspace')
  const tree = run(['Select'], ws)
  t.equal(tree.screen, 'tree')
  const dep = run(['MoveNext', 'Select'], tree)
  t.equal(dep.screen, 'dep')

  t.equal(run(['Back'], dep).screen, 'tree')
  t.equal(run(['Back', 'Back'], dep).screen, 'workspace')
  t.equal(run(['Back', 'Back', 'Back'], dep).screen, 'summary')
  t.equal(
    run(['Back', 'Back', 'Back', 'Back'], dep).screen,
    'summary',
    'quitting is an effect, not a state, so back bottoms out here',
  )
})

t.test(
  'an unchanged intermediate is context, not a destination',
  async t => {
    const step = (name: string) => ({
      id: `~npm~${name}@1.0.0`,
      name,
    })
    const d = {
      ...diff,
      mutations: [
        resolved('deep', 'leaf', '1.0.0', '1.0.1', {
          path: [step('root'), step('middle')],
        }),
      ],
      regions: [{ ...diff.regions[0], mutationIds: ['deep'] }],
    } as unknown as GraphDiff
    // rows: root (no change), middle (no change), leaf (changed)
    const at = (i: number) => ({
      ...initialState,
      screen: 'tree' as const,
      depIndex: i,
    })
    t.equal(reduce(at(0), 'Select', d).screen, 'tree', 'the root')
    t.equal(
      reduce(at(1), 'Select', d).screen,
      'tree',
      'the intermediate',
    )
    t.equal(reduce(at(2), 'Select', d).screen, 'dep', 'the change')
  },
)

t.test(
  'moving clamps, and invalidates the cursors below',
  async t => {
    t.equal(
      run(['MovePrevious']).workspaceIndex,
      0,
      'no wrap backwards',
    )
    const deep = run(['Select', 'Select', 'MoveNext'])
    t.equal(deep.depIndex, 1)
    // stepping to another tree cannot keep a dep cursor from the old one
    const moved = run(['Back', 'MoveNext'], deep)
    t.equal(moved.screen, 'workspace')
    t.equal(moved.depIndex, 0)
    t.equal(run(['Back', 'Back'], deep).screen, 'summary')
  },
)

t.test(
  'select does nothing when there is nothing to select',
  async t => {
    t.strictSame(
      reduce(initialState, 'Select', empty),
      initialState,
      'an empty diff has no workspace to open',
    )
    t.equal(
      reduce({ ...initialState, screen: 'dep' }, 'Select', diff)
        .screen,
      'dep',
      'the dep screen is the bottom',
    )
  },
)

t.test('the legend covers whatever is behind it', async t => {
  const open = run(['ToggleLegend'])
  t.equal(open.legend, true)
  t.equal(
    run(['Select'], open).screen,
    'summary',
    'keys do not reach the screen underneath',
  )
  t.equal(run(['MoveNext'], open).workspaceIndex, 0)
  t.equal(run(['ToggleLegend'], open).legend, false, 'toggles shut')
  t.equal(run(['Back'], open).legend, false, 'and back closes it')
  t.equal(
    run(['Back'], open).screen,
    'summary',
    'without also stepping up a level',
  )
})

t.test('toggling a filter re-clamps every cursor', async t => {
  // three noise changes hang under the same tree, so turning identity
  // off shrinks that tree out from under a cursor parked at the bottom
  const step = { id: '~npm~beta@1.1.0', name: 'beta' }
  const d = {
    ...diff,
    mutations: [
      ...diff.mutations,
      ...['n1', 'n2', 'n3'].map(id =>
        resolved(id, id, '1.0.0', '1.0.1', {
          identityOnly: true,
          path: [step],
        }),
      ),
    ],
    regions: [
      {
        ...diff.regions[0],
        mutationIds: ['real-a', 'real-b', 'n1', 'n2', 'n3'],
      },
    ],
  } as unknown as GraphDiff

  const deep = run(
    [
      'Select',
      'Select',
      'MoveNext',
      'MoveNext',
      'MoveNext',
      'MoveNext',
    ],
    at('workspace', d, IDENTITY),
    d,
  )
  t.equal(deep.depIndex, 4, 'parked on the last of five rows')

  const off = reduce(deep, 'ToggleIdentity', d)
  t.equal(off.identity, false)
  t.equal(
    off.depIndex,
    view(d, off).lines.length - 1,
    'clamped to the last row that still exists',
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

    const deep = run(
      ['Select', 'Select'],
      at('workspace', onlyNoise, IDENTITY),
      onlyNoise,
    )
    t.equal(deep.screen, 'tree')
    t.equal(
      reduce(deep, 'ToggleIdentity', onlyNoise).screen,
      'summary',
      'never strand the reader on a screen with nothing on it',
    )
  },
)

t.test('view derives everything the screens need', async t => {
  const v = view(diff, initialState)
  t.equal(v.workspace?.label, 'www/docs')
  t.equal(v.trees.length, 1)
  t.equal(v.tree?.name, 'beta')
  t.strictSame(
    v.lines.map(l => l.name),
    ['beta', 'alpha'],
  )
  t.strictSame(view(empty, initialState).lines, [], 'an empty diff')
})

t.test('clamping an empty diff stays at zero', async t => {
  t.equal(reduce(initialState, 'MoveNext', empty).workspaceIndex, 0)
  t.equal(
    reduce(
      { ...initialState, screen: 'workspace' },
      'MoveNext',
      empty,
    ).treeIndex,
    0,
  )
  t.equal(
    reduce({ ...initialState, screen: 'tree' }, 'MovePrevious', empty)
      .depIndex,
    0,
  )
})

t.test(
  'workspaces are listed, not the regions they group into',
  async t => {
    // a region keyed on three importers is labelled "shared by 3
    // workspaces", which is true and useless to open; each member should
    // appear on its own, counting the changes that reach it
    const d = {
      summary: {},
      mutations: [
        resolved('mine', 'alpha', '1.0.0', '1.0.1'),
        resolved('ours', 'beta', '1.0.0', '1.0.1'),
      ],
      regions: [
        {
          id: 'a',
          label: 'www/docs',
          importers: ['workspace~www+docs'],
          nodes: [],
          mutationIds: ['mine'],
        },
        {
          id: 'b',
          label: 'shared by 3 workspaces',
          importers: [
            'workspace~www+docs',
            'workspace~src+cli-sdk',
            'file~_d',
          ],
          nodes: [],
          mutationIds: ['ours'],
        },
      ],
    } as unknown as GraphDiff

    const ws = workspacesOf(d, OFF)
    t.strictSame(
      ws.map(w => `${w.label}:${w.changes.length}`),
      ['www/docs:2', '.:1', 'src/cli-sdk:1'],
      'the shared change is counted for each member, most first',
    )
    t.notOk(
      ws.some(w => w.label.includes('shared by')),
      'no synthetic region label is ever offered as a workspace',
    )
  },
)

t.test(
  'changes nothing reaches still get somewhere to live',
  async t => {
    const d = {
      summary: {},
      mutations: [resolved('orphan', 'alpha', '1.0.0', '1.0.1')],
      regions: [
        {
          id: 'unreachable',
          label: 'unreachable',
          importers: [],
          nodes: [],
          mutationIds: ['orphan'],
        },
      ],
    } as unknown as GraphDiff
    const [ws] = workspacesOf(d, OFF)
    t.equal(ws?.changes.length, 1)
    t.match(ws?.label, /nothing reaches/)
  },
)

t.test(
  'workspacesFor unions the reach of a set of changes',
  async t => {
    const d = {
      summary: {},
      mutations: [
        resolved('a', 'alpha', '1.0.0', '1.0.1'),
        resolved('b', 'beta', '1.0.0', '1.0.1'),
      ],
      regions: [
        {
          id: 'r1',
          label: 'www/docs',
          importers: ['workspace~www+docs'],
          nodes: [],
          mutationIds: ['a'],
        },
        {
          id: 'r2',
          label: 'shared',
          importers: ['workspace~www+docs', 'workspace~src+cli-sdk'],
          nodes: [],
          mutationIds: ['b'],
        },
      ],
    } as unknown as GraphDiff
    const [a, b] = d.mutations as [Mutation, Mutation]
    t.strictSame(workspacesFor(d, [a]), ['www/docs'])
    t.strictSame(
      workspacesFor(d, [a, b]),
      ['src/cli-sdk', 'www/docs'],
      'counted once each, sorted',
    )
    t.strictSame(workspacesFor(d, []), [])
    t.strictSame(
      workspacesFor(d, [mut({ id: 'nowhere' })]),
      [],
      'a change in no region reaches nothing',
    )
  },
)

t.test('n and p step sideways between trees', async t => {
  const step = { id: '~npm~beta@1.1.0', name: 'beta' }
  const d = {
    ...diff,
    mutations: [
      resolved('t1', 'beta', '1.0.0', '1.1.0'),
      resolved('t2', 'gamma', '1.0.0', '1.1.0'),
      resolved('t1-kid', 'alpha', '1.0.0', '1.0.1', { path: [step] }),
    ],
    regions: [
      { ...diff.regions[0], mutationIds: ['t1', 't2', 't1-kid'] },
    ],
  } as unknown as GraphDiff

  const tree = run(['Select', 'Select'], at('workspace', d), d)
  t.equal(tree.screen, 'tree')
  t.equal(tree.treeIndex, 0)

  const next = reduce(tree, 'NextTree', d)
  t.equal(next.treeIndex, 1, 'without going back up a level')
  t.equal(next.screen, 'tree')
  t.equal(next.depIndex, 0, 'the row cursor resets with the tree')
  t.equal(reduce(next, 'PreviousTree', d).treeIndex, 0)
  t.equal(
    reduce(next, 'NextTree', d).treeIndex,
    1,
    'clamped at the last tree',
  )
  t.equal(
    reduce(initialState, 'NextTree', d).treeIndex,
    0,
    'no tree is in focus on the summary, so it does nothing',
  )
  t.equal(
    reduce({ ...initialState, screen: 'workspace' }, 'NextTree', d)
      .treeIndex,
    0,
    'nor on the workspace list',
  )
})

t.test(
  'the reach list opens from a tree and backs out to it',
  async t => {
    const tree = run(['Select', 'Select'])
    t.equal(reduce(tree, 'ShowReach', diff).screen, 'reach')
    t.equal(
      reduce({ ...tree, screen: 'dep' }, 'ShowReach', diff).screen,
      'reach',
      'and from a package inside it',
    )
    t.equal(
      reduce(initialState, 'ShowReach', diff).screen,
      'summary',
      'but not before a tree is in focus',
    )
    const reach = reduce(tree, 'ShowReach', diff)
    t.equal(reduce(reach, 'Back', diff).screen, 'tree')
    t.equal(
      reduce(reach, 'MoveNext', diff).depIndex,
      reach.depIndex,
      'it is read, not walked',
    )
  },
)

t.test('alerts flatten worst-first and resolve to names', async t => {
  const d = {
    ...diff,
    alerts: {
      '~npm~beta@1.1.0': [
        { type: 'copyleftLicense', severity: 'low' },
        { type: 'shellAccess', severity: 'medium' },
      ],
      '~npm~alpha@1.0.1': [
        { type: 'malware', severity: 'critical', cve: 'CVE-1' },
      ],
    },
  } as unknown as GraphDiff

  t.strictSame(
    alertRows(d).map(r => `${r.severity} ${r.name} ${r.type}`),
    [
      'critical alpha malware',
      'medium beta shellAccess',
      'low beta copyleftLicense',
    ],
    'a critical buried under three lows may as well not be reported',
  )
  t.equal(alertRows(d)[0]?.cve, 'CVE-1')
  t.strictSame(alertRows(diff), [], 'none without --security')

  t.equal(alertsFor(d, '~npm~beta@1.1.0').length, 2)
  t.strictSame(alertsFor(d, '~npm~nothing@1.0.0'), [])
  t.strictSame(alertsFor(d, undefined), [], 'a row with no node')
  t.strictSame(
    alertsFor(diff, '~npm~beta@1.1.0'),
    [],
    'no alerts at all',
  )

  // same grade, so the tie breaks on name
  const tied = {
    ...diff,
    alerts: {
      '~npm~zeta@1.0.0': [{ type: 'malware', severity: 'critical' }],
      '~npm~alpha@1.0.0': [{ type: 'malware', severity: 'critical' }],
    },
  } as unknown as GraphDiff
  t.strictSame(
    alertRows(tied).map(r => r.name),
    ['alpha', 'zeta'],
  )
})

t.test('alerts count per set of changes, and per change', async t => {
  const flagged = {
    ...diff,
    alerts: {
      '~npm~beta@1.1.0': [
        { type: 'shellAccess', severity: 'medium' },
      ],
    },
  } as unknown as GraphDiff
  const changes = visibleMutations(flagged, flagged.regions[0], OFF)
  t.equal(
    alertCount(flagged, changes),
    1,
    'one of the two changes carries one',
  )
  t.equal(alertCount(diff, changes), 0, 'none without a lookup')
  t.equal(alertCount(flagged, []), 0)

  // the head side is what an alert keys on
  const [alpha, beta] = changes as [Mutation, Mutation]
  t.equal(nodeIdOf(beta), '~npm~beta@1.1.0')
  t.equal(nodeIdOf(alpha), '~npm~alpha@1.0.1')
  t.equal(nodeIdOf(undefined), undefined)
  t.equal(
    nodeIdOf(mut({ id: 'x', kind: 'node-added' })),
    '~npm~thing@1.0.0',
    'an addition has no other side',
  )
  t.equal(
    nodeIdOf(
      mut({
        id: 'y',
        kind: 'edge-added',
        edge: { name: 'z' } as never,
      }),
    ),
    undefined,
    'an edge change is about no single package',
  )
})

/** The fixture with something in every summary section. */
const rich = {
  ...diff,
  mutations: [
    ...diff.mutations,
    resolved('big', 'gamma', '1.0.0', '2.0.0', {
      severity: 'major',
    }),
  ],
  regions: [
    {
      ...(diff.regions[0] as object),
      mutationIds: ['real-a', 'real-b', 'noise-a', 'big'],
    },
    diff.regions[1],
  ],
  alerts: {
    '~npm~beta@1.1.0': [
      { type: 'shellAccess', severity: 'medium' },
      { type: 'copyleftLicense', severity: 'low' },
    ],
    '~npm~alpha@1.0.1': [{ type: 'shellAccess', severity: 'medium' }],
  },
} as unknown as GraphDiff

t.test('a flagged package says which one and how far', async t => {
  const [first] = alertRows(rich)
  t.equal(first?.name, 'alpha')
  t.equal(first?.version, '1.0.1', 'the version, not the raw id')
  t.strictSame(first?.reach, ['www/docs'])
  t.strictSame(
    alertRows({
      ...rich,
      alerts: {
        '~npm~nothing@1.0.0': [{ type: 'x', severity: 'low' }],
      },
    } as unknown as GraphDiff)[0]?.reach,
    [],
    'nothing in the diff changed it, so nothing reaches it',
  )
})

t.test('alerts group by kind, worst first', async t => {
  const groups = alertGroups(rich)
  t.strictSame(
    groups.map(g => `${g.type} ${g.packages.length}`),
    ['shellAccess 2', 'copyleftLicense 1'],
    'two packages shell out, said once',
  )
  t.equal(groups[0]?.severity, 'medium', 'the worst grade it holds')
  t.strictSame(alertGroups(diff), [], 'nothing to group')
})

t.test('the summary reads top down, worst first', async t => {
  const rows = summaryRows(rich, initialState)
  t.strictSame(
    rows
      .filter(r => r.kind === 'heading')
      .map(r => `${r.label} ${r.count}`),
    ['SECURITY 2', 'MAJOR VERSIONS 1', 'UPGRADED 2', 'WORKSPACES 1'],
    'the count matches the rows under it, or something looks hidden',
  )
  t.notOk(selectable(rows[0]), 'a heading is not a place to stop')
  t.notOk(
    selectable(rows.find(r => r.kind === 'gap')),
    'nor is a spacer',
  )
  t.equal(
    summaryCursor(rows, 0),
    1,
    'so the cursor starts on the first real row',
  )
  t.equal(
    summaryCursor(rows, 1),
    1,
    'and stays put when it is already',
  )
  // the last row is a workspace, so walking backwards off the end lands
  // on the nearest thing above
  t.equal(
    summaryCursor([{ kind: 'gap', key: 'g' }], 0),
    0,
    'nothing selectable at all',
  )
  t.equal(
    summaryCursor(
      [
        {
          kind: 'workspace',
          key: 'w',
          workspace: { id: 'a', label: 'a', changes: [] },
        },
        { kind: 'heading', key: 'h', label: 'X', count: 0 },
      ],
      1,
    ),
    0,
    'looks back when there is nothing ahead',
  )
})

t.test('walking the summary skips its scaffolding', async t => {
  const at = (s: State) =>
    summaryRows(rich, s)[view(rich, s).summaryIndex]
  let state = initialState
  const seen: string[] = []
  for (let i = 0; i < 6; i++) {
    seen.push(at(state)?.kind ?? 'none')
    state = reduce(state, 'MoveNext', rich)
  }
  t.notOk(
    seen.includes('heading') || seen.includes('gap'),
    'never lands on a heading or a spacer',
  )
  t.strictSame(
    seen,
    ['alert', 'alert', 'change', 'change', 'change', 'workspace'],
    'straight down the page, section to section',
  )
  t.equal(
    reduce(initialState, 'MovePrevious', rich).summaryIndex,
    initialState.summaryIndex,
    'and does not climb into the heading above',
  )
})

t.test('every summary row opens something', async t => {
  // an alert row opens the packages carrying that kind of alert
  const alert = reduce(initialState, 'Select', rich)
  t.equal(alert.screen, 'alert')
  t.equal(view(rich, alert).group?.type, 'shellAccess')
  t.strictSame(
    view(rich, alert).group?.packages.map(p => p.name),
    ['alpha', 'beta'],
  )

  // and from there, the package's own tree
  const tree = reduce(alert, 'Select', rich)
  t.equal(tree.screen, 'tree')
  t.equal(view(rich, tree).tree?.name, 'beta', 'alpha hangs off beta')
  t.equal(
    reduce(alert, 'Back', rich).screen,
    'summary',
    'and back out again',
  )

  // a change row goes straight to the tree it sits in
  const change = run(
    ['MoveNext', 'MoveNext', 'Select'],
    initialState,
    rich,
  )
  t.equal(change.screen, 'tree')

  // a workspace row opens its list of trees
  const ws = run(['Select'], at('workspace', rich), rich)
  t.equal(ws.screen, 'workspace')
  t.equal(view(rich, ws).workspace?.label, 'www/docs')
})

t.test('opening something that is not in the tree', async t => {
  t.equal(locate(rich, OFF, undefined), undefined, 'nothing to find')
  t.equal(
    locate(rich, OFF, '~npm~nowhere@1.0.0'),
    undefined,
    'not in any workspace',
  )
  // a group whose package is not in a tree leaves the reader where they are
  const orphan = {
    ...rich,
    alerts: {
      '~npm~nowhere@1.0.0': [{ type: 'x', severity: 'low' }],
    },
  } as unknown as GraphDiff
  const at = reduce(initialState, 'Select', orphan)
  t.strictSame(reduce(at, 'Select', orphan), at, 'so nothing moves')
})

t.test('alerts on things a version cannot describe', async t => {
  const git = '~git~github%3Aa%2Fb~main'
  const rows = alertRows({
    ...diff,
    mutations: [
      ...diff.mutations,
      mut({
        id: 'e',
        kind: 'edge-added',
        edge: { name: 'z' } as never,
      }),
    ],
    alerts: { [git]: [{ type: 'malware', severity: 'critical' }] },
  } as unknown as GraphDiff)
  t.equal(rows[0]?.version, '', 'a git id carries no version to show')
  t.strictSame(
    rows[0]?.reach,
    [],
    'and an edge change names no package',
  )
})

t.test('groups of the same grade break the tie', async t => {
  const grouped = (alerts: Record<string, unknown>) =>
    alertGroups({ ...diff, alerts } as unknown as GraphDiff).map(
      g => g.type,
    )
  t.strictSame(
    grouped({
      '~npm~a@1.0.0': [
        { type: 'lonely', severity: 'low' },
        { type: 'common', severity: 'low' },
      ],
      '~npm~b@1.0.0': [{ type: 'common', severity: 'low' }],
    }),
    ['common', 'lonely'],
    'the one hitting more packages leads',
  )
  t.strictSame(
    grouped({
      '~npm~a@1.0.0': [
        { type: 'zeta', severity: 'low' },
        { type: 'alpha', severity: 'low' },
      ],
    }),
    ['alpha', 'zeta'],
    'and an outright tie sorts by name',
  )
})

t.test('walking a list of flagged packages', async t => {
  const at = reduce(initialState, 'Select', rich)
  t.equal(reduce(at, 'MoveNext', rich).alertPackageIndex, 1)
  t.equal(
    reduce({ ...initialState, screen: 'alert' }, 'MoveNext', diff)
      .alertPackageIndex,
    0,
    'a screen with nothing on it does not move',
  )
  const bare: State = { ...initialState, screen: 'alert' }
  t.strictSame(
    reduce(bare, 'Select', diff),
    bare,
    'and opens nothing either',
  )
})

t.test('finding a package says where it lives', async t => {
  const hits = searchHits(rich, OFF, 'alpha')
  t.equal(hits.length, 1)
  t.equal(hits[0]?.name, 'alpha')
  t.strictSame(hits[0]?.workspaces, ['www/docs'])
  t.strictSame(
    hits[0]?.trees,
    ['beta'],
    'the direct dependency it came in under, which is the point',
  )
  t.equal(
    nodeIdOf(hits[0]?.mutation),
    '~npm~alpha@1.0.1',
    'and something to open',
  )

  t.strictSame(
    searchHits(rich, OFF, '').map(h => h.name),
    ['alpha', 'beta', 'gamma'],
    'the box opens onto everything, so it can be browsed',
  )
  t.strictSame(
    searchHits(rich, OFF, '  ').map(h => h.name),
    ['alpha', 'beta', 'gamma'],
    'and whitespace is not a query',
  )
  t.strictSame(searchHits(rich, OFF, 'nope'), [], 'no such package')
  t.equal(
    searchHits(rich, OFF, 'ALPH').length,
    1,
    'case is not something a reader should have to get right',
  )
  t.strictSame(
    searchHits(rich, OFF, 'a').map(h => h.name),
    ['alpha', 'beta', 'gamma'],
    'a substring matches anywhere in the name',
  )
})

/**
 * A tree whose root never changed: nobody bumped delta, but the package
 * under it moved, so delta is drawn as context -- and is exactly what a
 * reader cannot find by scrolling.
 */
const context = {
  ...rich,
  mutations: [
    ...rich.mutations,
    resolved('ctx', 'epsilon', '1.0.0', '1.0.1', {
      path: [{ id: '~npm~delta@1.0.0', name: 'delta' }],
    }),
  ],
  regions: [
    {
      ...(rich.regions[0] as object),
      mutationIds: ['real-a', 'real-b', 'noise-a', 'big', 'ctx'],
    },
    rich.regions[1],
  ],
} as unknown as GraphDiff

t.test(
  'a package that is only ever context still turns up',
  async t => {
    const [hit] = searchHits(context, OFF, 'delta')
    t.equal(hit?.name, 'delta', 'found by the tree it roots')
    t.equal(hit?.mutation, undefined, 'so there is nothing to open')
    t.strictSame(hit?.trees, ['delta'])
    t.strictSame(hit?.workspaces, ['www/docs'])
  },
)

t.test(
  'what was typed sorts above what merely contains it',
  async t => {
    const named = (q: string) =>
      searchHits(rich, OFF, q).map(h => h.name)
    t.strictSame(
      named('beta'),
      ['beta'],
      'an exact name is the one wanted',
    )
    const prefixed = {
      ...rich,
      mutations: [
        ...rich.mutations,
        resolved('pre', 'alp', '1.0.0', '1.0.1', {
          path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
        }),
        resolved('mid', 'unalpha', '1.0.0', '1.0.1', {
          path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
        }),
      ],
      regions: [
        {
          ...(rich.regions[0] as object),
          mutationIds: ['real-a', 'real-b', 'big', 'pre', 'mid'],
        },
        rich.regions[1],
      ],
    } as unknown as GraphDiff
    t.strictSame(
      searchHits(prefixed, OFF, 'alp').map(h => h.name),
      ['alp', 'alpha', 'unalpha'],
      'exact, then what starts with it, then the rest by name',
    )

    // the scope is not the part anyone types
    const scoped = {
      ...rich,
      mutations: [
        ...rich.mutations,
        resolved('sc', '@scope/alping', '1.0.0', '1.0.1', {
          path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
        }),
        resolved('un', 'unalp', '1.0.0', '1.0.1', {
          path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
        }),
      ],
      regions: [
        {
          ...(rich.regions[0] as object),
          mutationIds: ['real-a', 'real-b', 'big', 'sc', 'un'],
        },
        rich.regions[1],
      ],
    } as unknown as GraphDiff
    t.strictSame(
      searchHits(scoped, OFF, 'alp').map(h => h.name),
      ['alpha', '@scope/alping', 'unalp'],
      'the scope is not the part anyone types, so it is skipped',
    )
  },
)

t.test('the search box takes what is typed', async t => {
  const open = reduce(initialState, 'OpenSearch', rich)
  t.equal(open.screen, 'search')
  t.equal(open.query, '')

  const typed = ['a', 'l', 'p'].reduce(
    (s, char) => reduce(s, { key: 'Type', char }, rich),
    open,
  )
  t.equal(typed.query, 'alp')
  t.equal(reduce(typed, 'Backspace', rich).query, 'al')
  t.equal(
    reduce(reduce(open, 'Backspace', rich), 'Backspace', rich).query,
    '',
    'backing off an empty box is not an error',
  )

  // the list under the cursor is a different list after every keystroke
  const moved = reduce(typed, 'MoveNext', rich)
  t.equal(moved.searchIndex, 0, 'one hit, so nowhere to move')
  t.equal(
    reduce(moved, { key: 'Type', char: 'x' }, rich).searchIndex,
    0,
  )

  t.equal(reduce(typed, 'Back', rich).screen, 'summary')
})

t.test('opening a search hit goes to its tree', async t => {
  const found = ['a', 'l', 'p', 'h', 'a'].reduce(
    (s, char) => reduce(s, { key: 'Type', char }, rich),
    reduce(initialState, 'OpenSearch', rich),
  )
  const at = reduce(found, 'Select', rich)
  t.equal(at.screen, 'tree')
  t.equal(view(rich, at).tree?.name, 'beta')
  t.equal(
    view(rich, at).lines[at.depIndex]?.name,
    'alpha',
    'with the cursor already on it',
  )

  // a context row has no change behind it, so there is nowhere to go
  const dim = ['d', 'e', 'l', 't', 'a'].reduce(
    (s, char) => reduce(s, { key: 'Type', char }, context),
    reduce(initialState, 'OpenSearch', context),
  )
  t.equal(view(context, dim).hits.length, 1)
  t.strictSame(reduce(dim, 'Select', context), dim)
})

t.test('a long section shows its first few', async t => {
  const many = {
    ...rich,
    mutations: [
      ...rich.mutations,
      ...Array.from({ length: 8 }, (_, i) =>
        resolved(`u${i}`, `pkg-${i}`, '1.0.0', '1.0.1', {
          path: [{ id: '~npm~beta@1.1.0', name: 'beta' }],
        }),
      ),
    ],
    regions: [
      {
        ...(rich.regions[0] as object),
        mutationIds: [
          'real-a',
          'real-b',
          'big',
          ...Array.from({ length: 8 }, (_, i) => `u${i}`),
        ],
      },
      rich.regions[1],
    ],
  } as unknown as GraphDiff

  const shown = (s: State) =>
    summaryRows(many, s).filter(r => r.kind === 'change').length
  const more = (s: State) =>
    summaryRows(many, s).find(r => r.kind === 'more')

  // ten upgrades, and the reader is not made to scroll past them all to
  // reach the workspaces
  t.equal(more(initialState)?.hidden, 4)
  const capped = shown(initialState)

  const on = at('more', many)
  const open = reduce(on, 'Select', many)
  t.strictSame(open.expanded, ['UPGRADED'])
  t.equal(shown(open), capped + 4, 'the rest of the section')
  t.equal(more(open)?.hidden, 0, 'and nothing left to ask for')
  t.equal(
    summaryRows(many, open)[open.summaryIndex]?.kind,
    'more',
    'the cursor follows the row it was on, or it cannot fold back',
  )

  const shut = reduce(open, 'Select', many)
  t.strictSame(shut.expanded, [])
  t.equal(shown(shut), capped)
  t.equal(summaryRows(many, shut)[shut.summaryIndex]?.kind, 'more')
})
