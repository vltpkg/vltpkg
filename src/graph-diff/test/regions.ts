import t from 'tap'
import { project } from '../src/projection.ts'
import { extractRegions, mutationNodes } from '../src/regions.ts'
import { lockfile, pkg, ROOT, ws } from './fixtures/lockfile.ts'
import type { Mutation } from '../src/types.ts'

const foo = pkg('foo', '1.0.0')
const bar = pkg('bar', '1.0.0')

const base = {
  id: 'm1',
  directness: 'transitive',
  identityOnly: false,
  alsoReachedBy: 0,
} as const

t.test('mutationNodes covers every kind', async t => {
  const node = { id: foo, name: 'foo' } as never
  const edge = { from: ROOT, name: 'foo', to: foo } as never
  const missing = { from: ROOT, name: 'foo', to: 'MISSING' } as never
  const cases: [Mutation, number][] = [
    [{ ...base, kind: 'node-added', node }, 1],
    [{ ...base, kind: 'node-removed', node }, 1],
    [
      {
        ...base,
        kind: 'node-changed',
        from: node,
        to: node,
        fields: [],
      },
      2,
    ],
    [
      {
        ...base,
        kind: 'node-identity-changed',
        from: node,
        to: node,
        reason: 'peer-set',
      },
      2,
    ],
    [
      {
        ...base,
        kind: 'peer-variants-regrouped',
        name: 'foo',
        from: [foo],
        to: [bar, foo],
      },
      3,
    ],
    [
      {
        ...base,
        kind: 'package-resolved',
        name: 'foo',
        from: node,
        to: node,
        direction: 'upgrade',
        severity: 'minor',
      },
      2,
    ],
    [{ ...base, kind: 'edge-added', edge }, 2],
    [{ ...base, kind: 'edge-removed', edge }, 2],
    [{ ...base, kind: 'edge-retargeted', from: edge, to: edge }, 4],
    [
      {
        ...base,
        kind: 'edge-respecified',
        from: edge,
        to: edge,
        fields: [],
      },
      4,
    ],
    [
      {
        ...base,
        kind: 'options-changed',
        fields: [],
        from: {},
        to: {},
      },
      0,
    ],
  ]
  for (const [m, count] of cases) {
    t.equal(mutationNodes(m).length, count, m.kind)
  }
  t.strictSame(
    mutationNodes({ ...base, kind: 'edge-added', edge: missing }),
    [ROOT],
    'a MISSING target contributes no node',
  )
})

t.test('nearest importer, not every reachable one', async t => {
  // both workspaces reach foo, but only www/docs reaches it directly;
  // src/cli goes through foo -> bar, so bar is www/docs's too
  const g = project(
    lockfile(
      [
        { id: foo, name: 'foo' },
        { id: bar, name: 'bar' },
      ],
      [
        { from: ws('www/docs'), name: 'foo', to: foo },
        { from: ws('src/cli'), name: 'foo', to: foo },
        { from: foo, name: 'bar', to: bar },
      ],
    ),
  )
  const m: Mutation = {
    ...base,
    kind: 'node-added',
    node: g.nodes.get(bar) as never,
  }
  const [region] = extractRegions([m], g, g)
  t.strictSame(
    region?.importers,
    [ws('src/cli'), ws('www/docs')].sort(),
    'bar is two hops from both, so both own it',
  )
  t.equal(region?.label, 'shared by 2 workspaces')
})

t.test('an importer that is itself the mutated node', async t => {
  const g = project(
    lockfile(
      [{ id: foo, name: 'foo' }],
      [{ from: ws('a/b'), name: 'foo', to: foo }],
    ),
  )
  const [region] = extractRegions(
    [
      {
        ...base,
        kind: 'node-added',
        node: g.nodes.get(ws('a/b')) as never,
      },
    ],
    g,
    g,
  )
  t.strictSame(region?.importers, [ws('a/b')])
  t.equal(region?.label, 'a/b')
  t.equal(
    region?.nodes[0]?.role,
    'context',
    'the importer is context in its own region, not a mutated member',
  )
})

t.test(
  'one mutation appears once per region even across nodes',
  async t => {
    const g = project(
      lockfile(
        [
          { id: foo, name: 'foo' },
          { id: bar, name: 'bar' },
        ],
        [
          { from: ROOT, name: 'foo', to: foo },
          { from: ROOT, name: 'bar', to: bar },
        ],
      ),
    )
    const regions = extractRegions(
      [
        {
          ...base,
          kind: 'edge-retargeted',
          from: g.edges.get(`${ROOT} foo`) as never,
          to: g.edges.get(`${ROOT} bar`) as never,
        },
      ],
      g,
      g,
    )
    t.equal(regions.length, 1)
    t.strictSame(regions[0]?.mutationIds, ['m1'], 'no duplicate ids')
  },
)

t.test('equal-sized regions sort by label', async t => {
  const g = project(
    lockfile(
      [
        { id: foo, name: 'foo' },
        { id: bar, name: 'bar' },
      ],
      [
        { from: ws('z/last'), name: 'foo', to: foo },
        { from: ws('a/first'), name: 'bar', to: bar },
      ],
    ),
  )
  const regions = extractRegions(
    [
      {
        ...base,
        kind: 'node-added',
        node: g.nodes.get(foo) as never,
      },
      {
        ...base,
        id: 'm2',
        kind: 'node-added',
        node: g.nodes.get(bar) as never,
      },
    ],
    g,
    g,
  )
  t.strictSame(
    regions.map(r => r.label),
    ['a/first', 'z/last'],
  )
})

t.test('a node reached twice is only walked once', async t => {
  const g = project(
    lockfile(
      [
        { id: foo, name: 'foo' },
        { id: bar, name: 'bar' },
      ],
      [
        { from: ws('a/b'), name: 'foo', to: foo },
        { from: foo, name: 'bar', to: bar },
      ],
    ),
  )
  // two mutations on the same node exercise the memo; a leaf with no
  // dependents at all exercises the empty-reverse-edge case
  const regions = extractRegions(
    [
      {
        ...base,
        kind: 'node-added',
        node: g.nodes.get(bar) as never,
      },
      {
        ...base,
        id: 'm2',
        kind: 'node-removed',
        node: g.nodes.get(bar) as never,
      },
    ],
    g,
    g,
  )
  t.equal(regions.length, 1)
  t.strictSame(regions[0]?.mutationIds, ['m1', 'm2'])
  t.strictSame(regions[0]?.importers, [ws('a/b')])
})

t.test(
  'a diamond is walked once, and removed nodes fall back to base',
  async t => {
    const left = pkg('left', '1.0.0')
    const right = pkg('right', '1.0.0')
    const nodes = [
      { id: foo, name: 'foo' },
      { id: left, name: 'left' },
      { id: right, name: 'right' },
      { id: bar, name: 'bar' },
    ]
    const edges = [
      { from: ws('a/b'), name: 'foo', to: foo },
      { from: foo, name: 'left', to: left },
      { from: foo, name: 'right', to: right },
      // both sides converge on bar, so foo is reached twice on the way up
      { from: left, name: 'bar', to: bar },
      { from: right, name: 'bar', to: bar },
    ]
    const g = project(lockfile(nodes, edges))
    const gone = project(lockfile([], []))
    const [region] = extractRegions(
      [
        {
          ...base,
          kind: 'node-removed',
          node: g.nodes.get(bar) as never,
        },
      ],
      gone,
      g,
    )
    t.strictSame(
      region?.importers,
      [ws('a/b')],
      'a node absent from head is resolved against base',
    )
  },
)

t.test('a node no importer reaches gets its own region', async t => {
  const g = project(lockfile([{ id: foo, name: 'foo' }], []))
  const [region] = extractRegions(
    [
      {
        ...base,
        kind: 'node-removed',
        node: g.nodes.get(foo) as never,
      },
    ],
    g,
    g,
  )
  t.strictSame(region?.importers, [])
  t.equal(region?.id, 'unreachable')
  t.equal(region?.label, 'unreachable')
  t.strictSame(region?.nodes[0]?.role, 'mutated')
})

t.test(
  'counts importers that reach further than the nearest',
  async t => {
    // near -> foo is one hop; far -> bar -> foo is two, so the region keys
    // on near alone and far only shows up in the count
    const g = project(
      lockfile(
        [
          { id: foo, name: 'foo' },
          { id: bar, name: 'bar' },
        ],
        [
          { from: ws('near'), name: 'foo', to: foo },
          { from: ws('far'), name: 'bar', to: bar },
          { from: bar, name: 'foo', to: foo },
        ],
      ),
    )
    const m: Mutation = {
      ...base,
      kind: 'node-added',
      node: g.nodes.get(foo) as never,
    }
    const [region] = extractRegions([m], g, g)
    t.strictSame(
      region?.importers,
      [ws('near')],
      'filed under the nearest',
    )
    t.equal(
      m.alsoReachedBy,
      1,
      'far is counted, not silently dropped',
    )

    const direct: Mutation = {
      ...base,
      id: 'm2',
      kind: 'node-added',
      node: g.nodes.get(bar) as never,
    }
    extractRegions([direct], g, g)
    t.equal(
      direct.alsoReachedBy,
      0,
      'a change only one importer reaches counts nobody else',
    )
  },
)
