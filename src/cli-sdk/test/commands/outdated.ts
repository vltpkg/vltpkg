import t from 'tap'
import type { Test } from 'tap'
import type { AddImportersDependenciesMap } from '@vltpkg/graph'
import type { DepID } from '@vltpkg/dep-id'
import type { LoadedConfig } from '../../src/config/index.ts'
import type {
  OutdatedReport,
  OutdatedResult,
} from '../../src/commands/outdated.ts'

// The real module is safe to import for pure functions and views — the
// readline interface is only created inside promptUpdateSelection.
const real = await import('../../src/commands/outdated.ts')

t.test('usage', async t => {
  t.matchSnapshot(real.usage().usage(), 'should have usage')
})

t.test('highestSatisfying', async t => {
  t.equal(
    real.highestSatisfying(['1.0.0', '1.5.0', '2.0.0'], '^1.0.0'),
    '1.5.0',
  )
  t.equal(real.highestSatisfying(['1.0.0'], undefined), undefined)
  t.equal(real.highestSatisfying([], '^1.0.0'), undefined)
})

t.test('rangePrefix', async t => {
  t.equal(real.rangePrefix(undefined), '^', 'defaults to caret')
  t.equal(real.rangePrefix('^1.0.0'), '^')
  t.equal(real.rangePrefix('~1.2.0'), '~')
  t.equal(real.rangePrefix('1.0.0'), '', 'exact keeps no operator')
  t.equal(real.rangePrefix('>=1.0.0'), '>=')
})

const reports: OutdatedReport[] = [
  {
    name: 'foo',
    current: '1.0.0',
    wanted: '1.5.0',
    latest: '2.0.0',
    type: 'prod',
    dependedBy: 'my-project',
    location: 'node_modules/foo',
  },
  {
    name: 'bar',
    current: '1.0.0',
    wanted: undefined,
    latest: '1.2.0',
    type: 'dev',
    dependedBy: 'my-project',
  },
  {
    name: 'qux',
    current: '1.0.0',
    wanted: '1.0.0',
    latest: '1.0.1',
    type: 'optional',
    dependedBy: 'my-project',
  },
  {
    name: 'baz',
    current: '1.0.0',
    wanted: undefined,
    latest: undefined,
    type: 'peer',
    dependedBy: 'bar',
  },
  {
    name: 'nover',
    current: undefined,
    wanted: '1.0.0',
    latest: '1.0.0',
    type: 'peerOptional',
    dependedBy: 'my-project',
  },
  {
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
  )
  t.matchSnapshot(
    real.views.human(
      {
        reports: [
          {
            name: 'foo',
            current: '1.0.0',
            latest: '2.0.0',
            type: 'prod',
            dependedBy: 'b',
          },
          {
            name: 'foo',
            current: '1.0.0',
            latest: '2.0.0',
            type: 'prod',
            dependedBy: 'a',
          },
        ],
      },
      { colors: false },
    ),
    'breaks name ties by the dependent',
  )
})

t.test('human view - update summary', async t => {
  const updatePlan = [
    {
      name: 'foo',
      from: '1.0.0',
      to: '^2.0.0',
      importer: 'my-project',
    },
    {
      name: 'bar',
      from: '~1.0.0',
      to: '~1.2.0',
      importer: 'my-project',
    },
  ]
  t.matchSnapshot(
    real.views.human(
      {
        reports: [reports[0]!, reports[1]!],
        updatePlan,
        applied: true,
      },
      { colors: false },
    ),
    'shows applied updates',
  )
  t.matchSnapshot(
    real.views.human(
      {
        reports: [reports[0]!],
        updatePlan: [
          ...updatePlan,
          { name: 'zed', to: '^1.0.0', importer: 'my-project' },
        ],
        applied: false,
      },
      { colors: false },
    ),
    'shows dry-run updates',
  )
  t.matchSnapshot(
    real.views.human(
      { reports: [], updatePlan: [], applied: false },
      { colors: false },
    ),
    'reports when there is nothing to update',
  )
})

t.test('json view', async t => {
  t.strictSame(real.views.json({ reports }), reports)
})

// ---------------------------------------------------------------------------
// Command integration tests (graph + query + registry + install mocked)
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
  from: FakeNode
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
  trans: {
    'dist-tags': { latest: '2.0.0' },
    versions: { '1.0.0': {}, '2.0.0': {} },
  },
  same: {
    'dist-tags': { latest: '2.0.0' },
    versions: { '2.0.0': {} },
  },
}

const myProject: FakeNode = {
  id: 'file;.',
  name: 'my-project',
  version: '1.0.0',
  importer: true,
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
const nodeBaz: FakeNode = {
  id: 'registry;;baz@1.0.0',
  name: 'baz',
  version: '1.0.0',
  importer: false,
}
const nodeTrans: FakeNode = {
  id: 'registry;;trans@1.0.0',
  name: 'trans',
  version: '1.0.0',
  importer: false,
}
const nodeSame: FakeNode = {
  id: 'registry;;same@2.0.0',
  name: 'same',
  version: '2.0.0',
  importer: false,
}

const mkEdge = (
  to: FakeNode,
  range: string | undefined,
  type: string,
  from: FakeNode = myProject,
): FakeEdge => ({
  name: to.name ?? 'anon',
  type,
  spec: { final: { range } },
  from,
  to,
})

const resultNodes = [nodeFoo, nodeBar, nodeBaz, nodeTrans, nodeSame]

const resultEdges: FakeEdge[] = [
  mkEdge(nodeFoo, '^1.0.0', 'prod'),
  mkEdge(nodeBar, '~1.0.0', 'dev'),
  // no latest available (404) -> not updatable
  mkEdge(nodeBaz, '^1.0.0', 'prod'),
  // transitive dependency (dependent is not an importer) -> not updatable
  mkEdge(nodeTrans, '^1.0.0', 'prod', nodeFoo),
  // already at latest -> not updatable
  mkEdge(nodeSame, '^2.0.0', 'optional'),
]

const mockGraph = {
  nodes: new Map([myProject, ...resultNodes].map(n => [n.id, n])),
  edges: new Set(resultEdges),
  importers: new Set([myProject]),
}

let capturedInstall:
  { opts: unknown; add: AddImportersDependenciesMap } | undefined
let mockAnswer = 'all'
// Mutable fixtures returned by the mocked Query so individual tests can
// swap in custom graphs without disturbing the shared set.
let currentEdges: FakeEdge[] = resultEdges
let currentNodes: FakeNode[] = resultNodes

const loadCommand = async (t: Test) =>
  t.mockImport<typeof import('../../src/commands/outdated.ts')>(
    '../../src/commands/outdated.ts',
    {
      '@vltpkg/graph': {
        actual: { load: () => mockGraph },
        GraphModifier: { maybeLoad: () => undefined },
        asDependency: (o: unknown) => o,
        install: async (
          opts: unknown,
          add: AddImportersDependenciesMap,
        ) => {
          capturedInstall = { opts, add }
          return { graph: {}, diff: undefined }
        },
      },
      '@vltpkg/query': {
        Query: class {
          async search() {
            return {
              edges: currentEdges,
              nodes: currentNodes,
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
      'node:readline/promises': {
        createInterface: (stdin: unknown, stdout: unknown) => {
          t.equal(stdin, process.stdin)
          t.equal(stdout, process.stdout)
          return {
            question: async () => mockAnswer,
            close: () => {},
          }
        },
      },
    },
  )

const specOptions = {
  registry: 'https://registry.npmjs.org/',
}

const makeConfig = (
  values: Record<string, unknown>,
  positionals: string[] = [],
  mainManifest: unknown = { name: 'my-project', version: '1.0.0' },
): LoadedConfig =>
  ({
    positionals,
    values,
    get: (k: string) => values[k],
    options: {
      ...specOptions,
      projectRoot: '/test/project',
      packageJson: { maybeRead: () => mainManifest },
    },
  }) as unknown as LoadedConfig

t.beforeEach(() => {
  capturedInstall = undefined
  mockAnswer = 'all'
  currentEdges = resultEdges
  currentNodes = resultNodes
})

t.test('report-only', async t => {
  const Command = await loadCommand(t)
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'human' }),
  )
  t.strictSame(
    res.reports.map(r => r.name).sort(),
    ['bar', 'baz', 'foo', 'same', 'trans'],
    'includes only registry, non-importer deps',
  )
  t.equal(
    res.updatePlan,
    undefined,
    'no update plan without --update',
  )
  t.equal(capturedInstall, undefined, 'does not install')
})

t.test('--update applies upgrades', async t => {
  const Command = await loadCommand(t)
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'human', update: true }),
  )
  t.strictSame(
    (res.updatePlan ?? []).map(u => `${u.name}@${u.to}`).sort(),
    ['bar@~1.2.0', 'foo@^2.0.0'],
    'plans upgrades for direct deps with a newer latest, preserving prefix',
  )
  t.equal(res.applied, true, 'marks the update as applied')
  t.ok(capturedInstall, 'calls install')
  t.equal(
    capturedInstall?.add.modifiedDependencies,
    true,
    'flags modified dependencies',
  )
  const importerDeps = capturedInstall?.add.get('file;.' as DepID)
  t.strictSame(
    [...(importerDeps?.keys() ?? [])].sort(),
    ['bar', 'foo'],
    'adds both upgrades under the importer',
  )
  t.matchSnapshot(
    real.views.human(res, { colors: false }),
    'rendered update output',
  )
})

t.test('--update --dry-run does not install', async t => {
  const Command = await loadCommand(t)
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'human', update: true, 'dry-run': true }),
  )
  t.equal((res.updatePlan ?? []).length, 2, 'still plans the updates')
  t.equal(res.applied, false, 'not applied in dry-run')
  t.equal(capturedInstall, undefined, 'install is skipped')
})

t.test('--interactive selects a subset', async t => {
  const Command = await loadCommand(t)
  mockAnswer = '1'
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'human', interactive: true }),
  )
  t.strictSame(
    (res.updatePlan ?? []).map(u => u.name),
    ['foo'],
    'updates only the selected dependency',
  )
  t.ok(capturedInstall, 'installs the selection')
})

t.test('--interactive with none selected', async t => {
  const Command = await loadCommand(t)
  mockAnswer = 'none'
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'human', interactive: true }),
  )
  t.strictSame(res.updatePlan, [], 'nothing planned')
  t.equal(res.applied, false)
  t.equal(capturedInstall, undefined, 'install is skipped')
})

t.test('--update without a project graph', async t => {
  const Command = await loadCommand(t)
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'json', update: true }, [], null),
  )
  t.strictSame(res.reports, [])
  t.strictSame(res.updatePlan, [])
  t.equal(res.applied, false)
})

t.test('report-only without a project graph', async t => {
  const Command = await loadCommand(t)
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'json' }, [], null),
  )
  t.strictSame(res.reports, [])
  t.equal(res.updatePlan, undefined)
})

t.test('handles missing metadata fields', async t => {
  const Command = await loadCommand(t)
  const fromNoName: FakeNode = { id: 'file;x', importer: true }
  const nodeAnon: FakeNode = {
    id: 'registry;;anon@1.0.0',
    importer: false,
  }
  currentNodes = [nodeFoo, nodeAnon]
  currentEdges = [
    // direct dep -> fetches foo's packument
    mkEdge(nodeFoo, '^1.0.0', 'prod', myProject),
    // second edge to the same node -> exercises the packument cache
    mkEdge(nodeFoo, '^1.0.0', 'dev', nodeBar),
    // undefined name/version/range and a dependent without a name
    mkEdge(nodeAnon, undefined, 'prod', fromNoName),
  ]
  const res: OutdatedResult = await Command.command(
    makeConfig({ view: 'json' }),
  )
  const anon = res.reports.find(r => r.name === 'anon')
  t.ok(anon, 'falls back to the edge name when the node has none')
  t.equal(anon?.current, undefined, 'tolerates a missing version')
  t.equal(anon?.dependedBy, 'file;x', 'falls back to the importer id')
})

t.test('workspace filter and positional names', async t => {
  const Command = await loadCommand(t)
  const conf = makeConfig({ view: 'json', workspace: ['pkgs/a'] }, [
    'foo',
  ])
  ;(conf.options as Record<string, unknown>).monorepo = {
    filter: () => [{ id: 'file;.' }],
  }
  const res: OutdatedResult = await Command.command(conf)
  t.ok(res.reports.length, 'still produces a report')
})

t.test('promptUpdateSelection parsing', async t => {
  const Command = await loadCommand(t)
  const entries: Parameters<typeof Command.promptUpdateSelection>[0] =
    [
      {
        report: {
          name: 'foo',
          current: '1.0.0',
          wanted: '1.5.0',
          latest: '2.0.0',
          type: 'prod',
          dependedBy: 'my-project',
        },
        saveType: 'prod',
        prefix: '^',
      },
      {
        report: {
          name: 'bar',
          current: undefined,
          wanted: undefined,
          latest: undefined,
          type: 'dev',
          dependedBy: 'my-project',
        },
        saveType: 'dev',
        prefix: '^',
      },
    ]

  mockAnswer = 'all'
  t.equal(
    (await Command.promptUpdateSelection(entries)).length,
    2,
    '"all" selects everything',
  )

  mockAnswer = ''
  t.equal(
    (await Command.promptUpdateSelection(entries)).length,
    2,
    'empty input selects everything',
  )

  mockAnswer = 'none'
  t.equal(
    (await Command.promptUpdateSelection(entries)).length,
    0,
    '"none" selects nothing',
  )

  mockAnswer = '2, 99, abc'
  const picked = await Command.promptUpdateSelection(entries)
  t.strictSame(
    picked.map(e => e.report.name),
    ['bar'],
    'ignores out-of-range and non-numeric tokens',
  )
})
