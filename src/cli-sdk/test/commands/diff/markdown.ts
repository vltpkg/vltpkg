import t from 'tap'
import { markdownDiffOutput } from '../../../src/commands/diff/markdown.ts'
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

const summary = {
  nodes: { base: 100, head: 150 },
  edges: { base: 200, head: 180 },
  counts: {},
  identityOnly: 7,
  regions: 1,
}

const diff = {
  schemaVersion: 1,
  summary,
  mutations: [
    resolved('big', 'yargs', '17.7.3', '18.1.0', {
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
    resolved('kid', 'alpha', '1.0.0', '1.0.1', {
      path: [{ id: '~npm~yargs@18.1.0', name: 'yargs' }],
    }),
  ],
  regions: [
    {
      id: 'r',
      label: 'www/docs',
      importers: ['workspace~www+docs'],
      nodes: [],
      mutationIds: ['big', 'back', 'gone', 'kid'],
    },
  ],
} as unknown as GraphDiff

t.test('renders a report worth pasting into a review', async t => {
  const out = markdownDiffOutput(diff, {
    base: 'main',
    head: 'feat/x',
  })
  t.matchSnapshot(out, 'markdown')

  t.match(out, /^## Lockfile diff/, 'a heading a comment can carry')
  t.match(out, /`main` → `feat\/x`/)
  // deltas, not before-and-after: the reader should not do subtraction
  t.match(out, /\*\*\+50\*\* packages/)
  t.match(out, /\*\*-20\*\* edges/)
  t.match(out, /### Major versions/)
  t.match(out, /### Downgraded/)
  t.match(out, /### Removed/)
  t.match(
    out,
    /\| `require-directory` \| `2\.1\.1` \|/,
    'a removal has a from and no to',
  )
  t.match(out, /<details>/, 'the long tail is folded away')
  t.match(out, /└─|├─/, 'and drawn as a tree inside')
})

t.test('every mark a tree can carry', async t => {
  const step = { id: '~npm~root@1.0.0', name: 'root' } as never
  const kinds = {
    ...diff,
    mutations: [
      resolved('r', 'root', '1.0.0', '1.0.1'),
      resolved('down', 'a', '2.0.0', '1.0.0', {
        direction: 'downgrade',
        severity: 'major',
        path: [step],
      }),
      mut({
        id: 'add',
        kind: 'node-added',
        node: node('b', '1.0.0'),
        path: [step],
      }),
      mut({
        id: 'del',
        kind: 'node-removed',
        node: node('c', '1.0.0'),
        path: [step],
      }),
      mut({
        id: 'ident',
        kind: 'node-identity-changed',
        from: node('d', '1.0.0'),
        to: node('d', '1.0.0'),
        reason: 'peer-set',
        identityOnly: true,
        path: [step],
      }),
      mut({
        id: 'meta',
        kind: 'node-changed',
        from: node('e', '1.0.0'),
        to: node('e', '1.0.0'),
        fields: ['dev'],
        path: [step],
      }),
      mut({
        id: 'edge',
        kind: 'edge-added',
        edge: { name: 'f', spec: '^1', type: 'prod' } as never,
        path: [step],
      }),
      mut({
        id: 'unedge',
        kind: 'edge-removed',
        edge: { name: 'g', spec: '^1', type: 'prod' } as never,
        path: [step],
      }),
    ],
    regions: [
      {
        ...diff.regions[0],
        mutationIds: [
          'r',
          'down',
          'add',
          'del',
          'ident',
          'meta',
          'edge',
          'unedge',
        ],
      },
    ],
  } as unknown as GraphDiff
  // identity is off by default, so ask for everything
  const out = markdownDiffOutput(kinds, { identity: true })
  for (const [mark, name] of [
    // major *and* a downgrade: it must draw as going backwards
    ['v', 'a'],
    ['+', 'b'],
    ['-', 'c'],
    ['=', 'd'],
    ['~', 'e'],
    ['+', 'f'],
    ['-', 'g'],
  ] as const) {
    // escape only what is regex-special: `\v` is a vertical tab, not a v
    const esc = mark.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')
    t.match(
      out,
      new RegExp(`${esc} ${name}\\b`),
      `${name} is ${mark}`,
    )
  }
})

t.test(
  'the reach column counts once it is more than one',
  async t => {
    const shared = {
      ...diff,
      regions: [
        {
          ...(diff.regions[0] as object),
          importers: ['workspace~www+docs', 'workspace~src+cli-sdk'],
        },
      ],
    } as unknown as GraphDiff
    t.match(
      markdownDiffOutput(shared),
      /\| 2 workspaces \|/,
      'naming both would not fit, and the number is the point',
    )
  },
)

t.test('what arrived and what merely repointed', async t => {
  const out = markdownDiffOutput({
    ...diff,
    mutations: [
      ...diff.mutations,
      mut({
        id: 'new',
        kind: 'node-added',
        node: node('brand', '1.0.0'),
      }),
      mut({
        id: 'ea',
        kind: 'edge-added',
        edge: { name: 'fresh', spec: '^1', type: 'prod' } as never,
      }),
      mut({
        id: 'er',
        kind: 'edge-removed',
        edge: { name: 'stale', spec: '^1', type: 'prod' } as never,
      }),
      mut({
        id: 'et',
        kind: 'edge-retargeted',
        from: { from: '~npm~p@1.0.0', name: 'q', to: '~npm~q@1.0.0' },
        to: { from: '~npm~p@1.0.0', name: 'q', to: '~npm~q@2.0.0' },
      } as never),
    ],
    regions: [
      {
        ...(diff.regions[0] as object),
        mutationIds: ['big', 'new', 'ea', 'er', 'et'],
      },
    ],
  } as unknown as GraphDiff)
  t.match(out, /### Added/)
  // an addition has nothing on the left, a removal nothing on the right
  t.match(out, /\| `brand` \| {2}\| `1\.0\.0` \|/)
  t.match(out, /### Edges/)
  t.match(out, /\| `fresh` \| {2}\| `\^1` \|/)
  t.match(out, /\| `stale` \| `\^1` \| {2}\|/)
  t.match(out, /\| `q` \| `1\.0\.0` \| `2\.0\.0` \|/)
  t.notMatch(out, /### Upgraded/, 'those live in the folded trees')
})

t.test('sections with nothing in them are dropped', async t => {
  const quiet = {
    ...diff,
    mutations: [resolved('dull', 'alpha', '1.0.0', '1.0.1')],
    regions: [{ ...diff.regions[0], mutationIds: ['dull'] }],
  } as unknown as GraphDiff
  const out = markdownDiffOutput(quiet)
  t.notMatch(out, /Major versions/)
  t.notMatch(out, /Downgraded/)
  t.notMatch(out, /Removed/)
  t.notMatch(out, /Security/)
  t.match(out, /### Workspaces/)
})

t.test('a highlight row with no versions to show', async t => {
  // highlights only ever holds resolutions and removals today, but the
  // table must not print `undefined` if that widens
  const odd = {
    ...diff,
    mutations: [
      mut({
        id: 'weird',
        kind: 'node-removed',
        node: node('gone', '1.0.0'),
      }),
      mut({
        id: 'opts',
        kind: 'options-changed',
        fields: ['registry'],
        from: {},
        to: {},
      }),
    ],
    regions: [{ ...diff.regions[0], mutationIds: ['weird', 'opts'] }],
  } as unknown as GraphDiff
  const out = markdownDiffOutput(odd)
  t.notMatch(out, /undefined/)
  t.match(out, /### Removed/)
})

t.test('an empty diff says so and stops', async t => {
  const out = markdownDiffOutput({
    ...diff,
    mutations: [],
    regions: [],
  })
  t.match(out, /No changes to the dependency graph/)
  t.notMatch(out, /### /, 'no empty scaffolding')
})

t.test('alerts lead, worst first, named not id-ed', async t => {
  const out = markdownDiffOutput({
    ...diff,
    alerts: {
      '~npm~alpha@1.0.1': [
        { type: 'copyleftLicense', severity: 'low' },
      ],
      '~npm~yargs@18.1.0': [
        { type: 'malware', severity: 'critical', cve: 'CVE-2024-1' },
      ],
    },
  } as unknown as GraphDiff)
  const security = out.slice(out.indexOf('### ⚠️ Security'))
  t.match(security, /`yargs@18\.1\.0` \| malware \| critical/)
  t.ok(
    security.indexOf('malware') < security.indexOf('copyleftLicense'),
    'critical sorts above low, because the top row is the one read',
  )
  t.notMatch(out, /~npm~yargs/, 'never the raw id')
  t.ok(
    out.indexOf('Security') < out.indexOf('Major versions'),
    'and the section leads the report',
  )
})

t.test('a pipe in a name cannot break the table', async t => {
  const out = markdownDiffOutput({
    ...diff,
    mutations: [resolved('odd', 'we|rd', '1.0.0', '1.0.1')],
    regions: [{ ...diff.regions[0], mutationIds: ['odd'] }],
    alerts: {
      '~npm~we|rd@1.0.1': [{ type: 'a|b', severity: 'critical' }],
    },
  } as unknown as GraphDiff)
  t.match(out, /a\\\|b/, 'escaped rather than splitting the row')
})

t.test('only the first workspaces are expanded', async t => {
  const many = {
    ...diff,
    regions: Array.from({ length: 4 }, (_, i) => ({
      id: `r${i}`,
      label: `ws-${i}`,
      importers: [`workspace~ws${i}`],
      nodes: [],
      mutationIds: ['kid'],
    })),
  } as unknown as GraphDiff
  const out = markdownDiffOutput(many, { maxWorkspaces: 2 })
  t.equal((out.match(/<details>/g) ?? []).length, 2)
  t.match(
    out,
    /…and 2 more workspaces/,
    'the rest are counted, not hidden',
  )
})

t.test('packages with no version to show', async t => {
  // a git or workspace id carries no version, and the row still has to
  // read as something rather than as `undefined`
  const git = '~git~github:a/b~main'
  const bare = (id: string, name: string) =>
    ({ id, name, type: 'git' }) as never
  const odd = {
    ...diff,
    mutations: [
      mut({
        id: 'a',
        kind: 'package-resolved',
        name: 'b',
        from: bare(git, 'b'),
        to: bare(git, 'b'),
        direction: 'downgrade',
        severity: 'unknown',
        path: [{ id: '~npm~root@1.0.0', name: 'root' } as never],
      }),
      mut({
        id: 'b',
        kind: 'node-removed',
        node: bare(git, 'dropped'),
      }),
      mut({ id: 'c', kind: 'node-added', node: bare(git, 'c') }),
    ],
    regions: [
      {
        id: 'r',
        label: 'unreachable',
        // nothing reaches these, so the Reaches column has nothing to say
        importers: [],
        nodes: [],
        mutationIds: ['a', 'b', 'c'],
      },
    ],
    alerts: { [git]: [{ type: 'malware', severity: 'critical' }] },
  } as unknown as GraphDiff
  const out = markdownDiffOutput(odd)
  t.notMatch(out, /undefined/, 'never leaks undefined into a cell')
  t.match(out, /### Downgraded/)
  t.match(out, /### Removed/)
  t.match(
    out,
    /`b@`|`b`/,
    'an id with no version still names the package',
  )

  // one workspace reaches it, so the column names it rather than
  // counting -- the other side of the same branch
  const one = markdownDiffOutput({
    ...odd,
    regions: [
      {
        ...(odd.regions[0] as object),
        importers: ['workspace~www+docs'],
      },
    ],
  } as unknown as GraphDiff)
  t.match(one, /\| www\/docs \|/)
})
