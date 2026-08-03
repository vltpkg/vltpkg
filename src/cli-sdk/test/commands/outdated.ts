import t from 'tap'
import type { Test } from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type {
  OutdatedReport,
  OutdatedResult,
} from '../../src/commands/outdated.ts'

// Import the real module for view + pure-function tests.
const real = await import('../../src/commands/outdated.ts')

t.test('usage', async t => {
  t.matchSnapshot(real.usage().usage(), 'should have usage')
})

t.test('highestSatisfying', async t => {
  t.equal(
    real.highestSatisfying(['1.0.0', '1.5.0', '2.0.0'], '^1.0.0'),
    '1.5.0',
    'returns the highest in-range version',
  )
  t.equal(
    real.highestSatisfying(['1.0.0', '2.0.0'], undefined),
    undefined,
    'returns undefined when no range provided',
  )
  t.equal(
    real.highestSatisfying([], '^1.0.0'),
    undefined,
    'returns undefined when no versions available',
  )
})

const reports: OutdatedReport[] = [
  {
    // major bump -> name red, latest red
    name: 'foo',
    current: '1.0.0',
    wanted: '1.5.0',
    latest: '2.0.0',
    type: 'prod',
    dependedBy: 'my-project',
    location: 'node_modules/foo',
  },
  {
    // minor bump -> latest cyan, no range so wanted falls back to current
    name: 'bar',
    current: '1.0.0',
    wanted: undefined,
    latest: '1.2.0',
    type: 'dev',
    dependedBy: 'my-project',
  },
  {
    // patch bump -> latest green, wanted == current (no diff highlight)
    name: 'qux',
    current: '1.0.0',
    wanted: '1.0.0',
    latest: '1.0.1',
    type: 'optional',
    dependedBy: 'my-project',
  },
  {
    // missing packument -> unknown latest
    name: 'baz',
    current: '1.0.0',
    wanted: undefined,
    latest: undefined,
    type: 'peer',
    dependedBy: 'bar',
  },
  {
    // installed version unknown -> highlightDiff receives no `from`
    name: 'nover',
    current: undefined,
    wanted: '1.0.0',
    latest: '1.0.0',
    type: 'peerOptional',
    dependedBy: 'my-project',
  },
  {
    // nothing is known -> every version column falls back to a placeholder
    name: 'unknown',
    current: undefined,
    wanted: undefined,
    latest: undefined,
    type: 'prod',
    dependedBy: 'my-project',
  },
]

t.test('human view', async t => {
  t.matchSnapshot(
    real.views.human({ reports }, { colors: false }),
    'renders a table without colors',
  )
  t.matchSnapshot(
    real.views.human({ reports }, { colors: true }),
    'renders a table with colors',
  )
  t.matchSnapshot(
    real.views.human({ reports: [reports[0]!] }, { colors: false }),
    'uses singular wording for a single package',
  )
  t.equal(
    real.views.human({ reports: [] }, { colors: false }),
    'All dependencies are up to date.',
    'reports when everything is up to date',
  )
})

t.test('json view', async t => {
  t.strictSame(
    real.views.json({ reports }),
    reports,
    'returns the raw reports array',
  )
})

// ---------------------------------------------------------------------------
// Command integration tests (graph + query + registry fully mocked)
// ---------------------------------------------------------------------------

type FakeNode = {
  id: string
  name?: string
  version?: string
  importer: boolean
  location?: string
}

type FakeEdge = {
  name: string
  type: string
  spec: { final: { range?: string } }
  from: { name?: string; id: string }
  to?: FakeNode
}

const packuments: Record<
  string,
  {
    'dist-tags': Record<string, string>
    versions: Record<string, unknown>
  }
> = {
  foo: {
    'dist-tags': { latest: '2.0.0' },
    versions: { '1.0.0': {}, '1.5.0': {}, '2.0.0': {} },
  },
  bar: {
    'dist-tags': { latest: '1.2.0' },
    versions: { '1.0.0': {}, '1.2.0': {} },
  },
  qux: {
    'dist-tags': { latest: '1.0.1' },
    versions: { '1.0.0': {}, '1.0.1': {} },
  },
  nover: {
    'dist-tags': { latest: '1.0.0' },
    versions: { '1.0.0': {} },
  },
  anon: {
    'dist-tags': { latest: '2.0.0' },
    versions: { '1.0.0': {}, '2.0.0': {} },
  },
}

const nodeFoo: FakeNode = {
  id: 'registry;;foo@1.0.0',
  name: 'foo',
  version: '1.0.0',
  importer: false,
  location: 'node_modules/foo',
}
const nodeBar: FakeNode = {
  id: 'registry;;bar@1.0.0',
  name: 'bar',
  version: '1.0.0',
  importer: false,
}
const nodeQux: FakeNode = {
  id: 'registry;;qux@1.0.0',
  name: 'qux',
  version: '1.0.0',
  importer: false,
}
const nodeBaz: FakeNode = {
  id: 'registry;;baz@1.0.0',
  name: 'baz',
  version: '1.0.0',
  importer: false,
}
const nodeNover: FakeNode = {
  id: 'registry;;nover@1.0.0',
  name: 'nover',
  version: undefined,
  importer: false,
}
const nodeWorkspace: FakeNode = {
  id: 'workspace;packages/a',
  name: 'a',
  version: '1.0.0',
  importer: true,
}
const nodeFile: FakeNode = {
  id: 'file;.',
  name: 'local-thing',
  version: '1.0.0',
  importer: false,
}
const nodeGhost: FakeNode = {
  id: 'registry;;ghost@1.0.0',
  name: 'ghost',
  version: '1.0.0',
  importer: false,
}
const nodeAnon: FakeNode = {
  // no name -> the edge name is used instead
  id: 'registry;;anon@1.0.0',
  name: undefined,
  version: '1.0.0',
  importer: false,
}

const mkEdge = (
  to: FakeNode | undefined,
  name: string,
  range: string | undefined,
  type: string,
  from = 'my-project',
): FakeEdge => ({
  name,
  type,
  spec: { final: { range } },
  from: { name: from, id: 'file;.' },
  to,
})

const resultNodes = [
  nodeFoo,
  nodeBar,
  nodeQux,
  nodeBaz,
  nodeNover,
  nodeAnon,
  nodeWorkspace,
  nodeFile,
]

const resultEdges: FakeEdge[] = [
  mkEdge(nodeFoo, 'foo', '^1.0.0', 'prod'),
  mkEdge(nodeBar, 'bar', undefined, 'dev'),
  // two dependents on the same node exercises the packument cache
  mkEdge(nodeQux, 'qux', '^1.0.0', 'optional', 'my-project'),
  mkEdge(nodeQux, 'qux', '^1.0.0', 'optional', 'bar'),
  mkEdge(nodeBaz, 'baz', '^1.0.0', 'peer', 'bar'),
  mkEdge(nodeNover, 'nover', '^1.0.0', 'peerOptional'),
  // node without a name + dependent without a name
  {
    ...mkEdge(nodeAnon, 'anon', '^1.0.0', 'prod'),
    from: { id: 'file;.' },
  },
  // excluded: importer node
  mkEdge(nodeWorkspace, 'a', '^1.0.0', 'prod'),
  // excluded: non-registry node
  mkEdge(nodeFile, 'local-thing', '^1.0.0', 'prod'),
  // excluded: node not present in the result set
  mkEdge(nodeGhost, 'ghost', '^1.0.0', 'prod'),
  // excluded: no destination node
  mkEdge(undefined, 'gone', '^1.0.0', 'prod'),
]

let capturedQuery: string | undefined

const mockGraph = {
  nodes: new Map(resultNodes.map(n => [n.id, n])),
  edges: new Set(resultEdges),
  importers: new Set([nodeWorkspace]),
}

const loadCommand = async (t: Test) =>
  t.mockImport<typeof import('../../src/commands/outdated.ts')>(
    '../../src/commands/outdated.ts',
    {
      '@vltpkg/graph': {
        actual: { load: () => mockGraph },
        GraphModifier: { maybeLoad: () => undefined },
      },
      '@vltpkg/query': {
        Query: class {
          async search(query: string) {
            capturedQuery = query
            return {
              edges: resultEdges,
              nodes: resultNodes,
              importers: [],
            }
          }
        },
      },
      '@vltpkg/dep-id': {
        hydrate: (_id: string, name: string) => ({ name }),
        splitDepID: (id: string) => id.split(';'),
      },
      '@vltpkg/package-info': {
        PackageInfoClient: class {
          async packument(spec: { name: string }) {
            const p = packuments[spec.name]
            if (!p) throw new Error('404')
            return p
          }
        },
      },
    },
  )

const makeConfig = (
  positionals: string[],
  values: Record<string, unknown>,
  options: Record<string, unknown> = {},
  mainManifest: unknown = { name: 'my-project', version: '1.0.0' },
): LoadedConfig =>
  ({
    positionals,
    values,
    get: (k: string) => values[k],
    options: {
      projectRoot: '/test/project',
      packageJson: { maybeRead: () => mainManifest },
      ...options,
    },
  }) as unknown as LoadedConfig

t.test('command', async t => {
  t.beforeEach(() => {
    capturedQuery = undefined
  })

  await t.test('default report', async t => {
    const Command = await loadCommand(t)
    const res: OutdatedResult = await Command.command(
      makeConfig([], { view: 'human' }),
    )
    t.equal(capturedQuery, '*:outdated', 'builds the default query')
    const names = res.reports.map(r => r.name).sort()
    t.strictSame(
      names,
      ['anon', 'bar', 'baz', 'foo', 'nover', 'qux', 'qux'],
      'includes only registry, non-importer deps with a destination',
    )
    const anon = res.reports.find(r => r.name === 'anon')
    t.equal(
      anon?.dependedBy,
      'file;.',
      'falls back to the dependent id',
    )
    t.matchSnapshot(
      real.views.human(res, { colors: false }),
      'rendered default report',
    )
  })

  await t.test('positional package names', async t => {
    const Command = await loadCommand(t)
    await Command.command(
      makeConfig(['foo', '@scope/pkg'], { view: 'human' }),
    )
    t.equal(
      capturedQuery,
      '#foo:outdated, #@scope\\/pkg:outdated',
      'scopes the query to the requested package names',
    )
  })

  await t.test('workspace filter', async t => {
    const Command = await loadCommand(t)
    const monorepo = {
      filter: () => [{ id: nodeWorkspace.id }],
    }
    await Command.command(
      makeConfig(
        [],
        { view: 'human', workspace: ['a'] },
        { monorepo },
      ),
    )
    t.equal(
      capturedQuery,
      '*:outdated',
      'still runs the outdated query',
    )
  })

  await t.test('no project graph', async t => {
    const Command = await loadCommand(t)
    const res: OutdatedResult = await Command.command(
      makeConfig([], { view: 'json' }, {}, null),
    )
    t.strictSame(
      res.reports,
      [],
      'returns no reports without a graph',
    )
  })
})
