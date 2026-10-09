import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type {
  PackageAlert,
  PackageReportData,
} from '@vltpkg/security-archive'
import type { SpecOptions } from '@vltpkg/spec'
import { normalizeManifest } from '@vltpkg/types'
import type { Manifest, NodeLike, Packument } from '@vltpkg/types'
import type { Test } from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type {
  OutdatedEntry,
  OutdatedResult,
} from '../../src/commands/outdated.ts'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'https://example.com/',
  },
  catalog: { cat: '^1.0.0' },
  catalogs: { tools: { tool: '^1.0.0' } },
} satisfies SpecOptions

const manifest = (
  name: string,
  version: string,
  extra: Partial<Manifest> = {},
): Manifest => ({
  name,
  version,
  dist: {
    tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
  },
  ...extra,
})

const packument = (
  name: string,
  versions: Manifest[],
  distTags: Record<string, string> = {
    latest: versions[versions.length - 1]?.version ?? '',
  },
): Packument => ({
  name,
  'dist-tags': distTags,
  versions: Object.fromEntries(versions.map(m => [m.version, m])),
})

const packuments: Record<string, Packument> = {
  // behind both wanted and latest, latest is demanding
  foo: packument('foo', [
    manifest('foo', '1.0.0'),
    manifest('foo', '1.2.0'),
    manifest('foo', '2.0.0', {
      engines: { node: '>=99' },
      peerDependencies: { react: '^19.0.0', vue: '^3.0.0' },
    }),
  ]),
  // fully up to date
  bar: packument('bar', [manifest('bar', '1.0.0')]),
  react: packument('react', [manifest('react', '18.2.0')]),
  // only behind latest, the pinned spec cannot move, and deprecated
  pinned: packument('pinned', [
    manifest('pinned', '1.0.0', { deprecated: 'use 1.1.0' }),
    manifest('pinned', '1.1.0'),
  ]),
  // no `latest` dist-tag, so latest falls back to the highest stable
  notag: packument(
    'notag',
    [
      manifest('notag', '1.0.0'),
      manifest('notag', '1.5.0'),
      manifest('notag', '2.0.0-beta.1'),
    ],
    {},
  ),
  // never installed
  missing: packument('missing', [manifest('missing', '1.0.0')]),
  // served by a named registry
  baz: packument('baz', [
    manifest('baz', '1.0.0'),
    manifest('baz', '1.1.0'),
  ]),
  // resolved through the catalog
  cat: packument('cat', [
    manifest('cat', '1.0.0'),
    manifest('cat', '2.0.0'),
  ]),
  // resolved through a named catalog
  tool: packument('tool', [
    manifest('tool', '1.0.0'),
    manifest('tool', '2.0.0'),
  ]),
  // a transitive dependency held back by its dependents
  lodash: packument('lodash', [
    manifest('lodash', '1.0.0'),
    manifest('lodash', '2.0.0'),
  ]),
  // installed as a prerelease of the version that then shipped
  pre: packument('pre', [
    manifest('pre', '2.0.0-beta.1'),
    manifest('pre', '2.0.0'),
  ]),
  // followed through a dist-tag rather than a range
  tagged: packument(
    'tagged',
    [manifest('tagged', '1.0.0'), manifest('tagged', '1.1.0')],
    { latest: '1.0.0', next: '1.1.0' },
  ),
  // a patch release only
  patchy: packument('patchy', [
    manifest('patchy', '1.0.0'),
    manifest('patchy', '1.0.1'),
  ]),
  // nothing published satisfies the declared range
  unsat: packument('unsat', [
    manifest('unsat', '1.0.0'),
    manifest('unsat', '1.5.0'),
  ]),
  // the installed version is gone and latest points nowhere
  gone: packument('gone', [manifest('gone', '1.1.0')], {
    latest: '9.9.9',
  }),
}

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
  dependencies: {
    foo: '^1.0.0',
    bar: '^1.0.0',
    react: '^18.0.0',
    missing: '^1.0.0',
    gitdep: 'github:some/repo',
    notag: '^1.0.0',
    // an alias shares foo's packument
    'foo-two': 'npm:foo@^1.0.0',
    baz: 'custom:baz@^1.0.0',
    cat: 'catalog:',
    tool: 'catalog:tools',
    pre: '^2.0.0-beta.0',
    tagged: 'next',
    patchy: '^1.0.0',
    unsat: '^5.0.0',
    gone: '^1.0.0',
  },
  devDependencies: {
    pinned: '1.0.0',
  },
}

const wsManifest = {
  name: 'a',
  version: '1.0.0',
  dependencies: {
    foo: '^1.0.0',
    // the workspace shares both catalog entries with the root
    cat: 'catalog:',
    tool: 'catalog:tools',
  },
}

const dir = t.testdir({
  // the outdated command requires a vlt install
  node_modules: { '.vlt': {} },
  'package.json': JSON.stringify(mainManifest),
  packages: {
    a: { 'package.json': JSON.stringify(wsManifest) },
  },
})

const scurry = new PathScurry(dir)
const packageJson = new PackageJson()
// the workspace config is handed over directly so the monorepo does
// not go looking for a vlt.json relative to the process cwd
const monorepo = Monorepo.load(dir, {
  scurry,
  packageJson,
  config: { packages: ['packages/*'] },
})

const graph = new Graph.Graph({
  projectRoot: dir,
  ...specOptions,
  mainManifest,
  monorepo,
})
const { mainImporter } = graph
const place = (
  from: Graph.Node,
  type: 'prod' | 'dev',
  name: string,
  bareSpec: string,
  mani?: Manifest,
) =>
  graph.placePackage(
    from,
    type,
    Spec.parse(name, bareSpec, specOptions),
    mani && normalizeManifest(mani),
  )
const foo = place(
  mainImporter,
  'prod',
  'foo',
  '^1.0.0',
  manifest('foo', '1.0.0', { dependencies: { lodash: '^1.0.0' } }),
)
const bar = place(
  mainImporter,
  'prod',
  'bar',
  '^1.0.0',
  manifest('bar', '1.0.0', { dependencies: { lodash: '~1.0.0' } }),
)
if (!foo || !bar) throw new Error('fixture nodes were not created')
place(foo, 'prod', 'lodash', '^1.0.0', manifest('lodash', '1.0.0'))
place(bar, 'prod', 'lodash', '~1.0.0', manifest('lodash', '1.0.0'))
place(
  mainImporter,
  'prod',
  'react',
  '^18.0.0',
  manifest('react', '18.2.0'),
)
place(mainImporter, 'prod', 'missing', '^1.0.0')
place(mainImporter, 'prod', 'gitdep', 'github:some/repo', {
  name: 'gitdep',
  version: '1.0.0',
  dist: { tarball: '' },
})
place(
  mainImporter,
  'prod',
  'notag',
  '^1.0.0',
  manifest('notag', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'foo-two',
  'npm:foo@^1.0.0',
  manifest('foo', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'baz',
  'custom:baz@^1.0.0',
  manifest('baz', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'cat',
  'catalog:',
  manifest('cat', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'tool',
  'catalog:tools',
  manifest('tool', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'pre',
  '^2.0.0-beta.0',
  manifest('pre', '2.0.0-beta.1'),
)
place(
  mainImporter,
  'prod',
  'tagged',
  'next',
  manifest('tagged', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'patchy',
  '^1.0.0',
  manifest('patchy', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'unsat',
  '^5.0.0',
  manifest('unsat', '1.0.0'),
)
place(
  mainImporter,
  'prod',
  'gone',
  '^1.0.0',
  manifest('gone', '1.0.0'),
)
place(
  mainImporter,
  'dev',
  'pinned',
  '1.0.0',
  manifest('pinned', '1.0.0'),
)

const wsNode = graph.nodes.get(
  joinDepIDTuple(['workspace', 'packages/a']),
)
if (!wsNode) throw new Error('workspace node was not created')
place(wsNode, 'prod', 'foo', '^1.0.0', manifest('foo', '1.0.0'))
place(wsNode, 'prod', 'cat', 'catalog:', manifest('cat', '1.0.0'))
place(
  wsNode,
  'prod',
  'tool',
  'catalog:tools',
  manifest('tool', '1.0.0'),
)

const alert = (
  key: string,
  type: string,
  severity: PackageAlert['severity'],
): PackageAlert => ({ key, type, severity, category: 'security' })

const report = (
  name: string,
  version: string,
  overall: number,
  alerts: PackageAlert[] = [],
): PackageReportData => ({
  id: `${name}@${version}`,
  author: [],
  size: 100,
  type: 'npm',
  name,
  version,
  license: 'MIT',
  alerts,
  score: {
    overall,
    license: 1,
    maintenance: 1,
    quality: 1,
    supplyChain: 1,
    vulnerability: 1,
  },
})

const id = (name: string, version: string, registry = ''): DepID =>
  joinDepIDTuple(['registry', registry, `${name}@${version}`])

const reports: Record<string, PackageReportData> = {
  [id('foo', '1.0.0')]: report('foo', '1.0.0', 0.9, [
    alert('cve-1', 'cve', 'high'),
  ]),
  [id('foo', '1.2.0')]: report('foo', '1.2.0', 0.9),
  [id('foo', '2.0.0')]: report('foo', '2.0.0', 0.3, [
    alert('mal-1', 'malware', 'critical'),
  ]),
  [id('pinned', '1.0.0')]: report('pinned', '1.0.0', 0.8),
  [id('baz', '1.0.0', 'custom')]: report('baz', '1.0.0', 0.7),
  [id('baz', '1.1.0', 'custom')]: report('baz', '1.1.0', 0.7),
  [id('lodash', '1.0.0')]: report('lodash', '1.0.0', 0.5),
}

let requested: string[] = []
let archiveStarts: NodeLike[][] = []
let archiveRefreshes: NodeLike[][] = []
let archiveFails = false
let refreshFails = false

class MockArchive {
  static async start({ nodes }: { nodes: NodeLike[] }) {
    if (archiveFails) throw new Error('archive unavailable')
    archiveStarts.push(nodes)
    return new MockArchive()
  }
  async refresh({ nodes }: { nodes: NodeLike[] }) {
    if (refreshFails) throw new Error('refresh failed')
    archiveRefreshes.push(nodes)
  }
  get(id: DepID) {
    return reports[id]
  }
}

const mockCommand = async (t: Test, g: Graph.Graph = graph) =>
  t.mockImport<typeof import('../../src/commands/outdated.ts')>(
    '../../src/commands/outdated.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: { load: () => g },
      }),
      '@vltpkg/package-info': {
        PackageInfoClient: class {
          async packument(spec: Spec): Promise<Packument> {
            const { name } = spec.final
            requested.push(name)
            const p = packuments[name]
            if (!p) throw new Error(`unexpected packument: ${name}`)
            return p
          }
        },
      },
      '@vltpkg/security-archive': { SecurityArchive: MockArchive },
      '../../src/query-host-contexts.ts': {
        createHostContextsMap: async () => new Map(),
      },
    },
  )

const Command = await mockCommand(t)

t.matchSnapshot(Command.usage().usageMarkdown())

const makeConfig = ({
  positionals = [],
  values = {},
  options = {},
  projectRoot = dir,
}: {
  positionals?: string[]
  values?: Record<string, unknown>
  options?: Record<string, unknown>
  projectRoot?: string
} = {}): LoadedConfig =>
  ({
    positionals,
    values,
    get: (key: string) => values[key],
    options: {
      ...specOptions,
      projectRoot,
      scurry,
      packageJson,
      monorepo,
      'node-version': 'v22.0.0',
      'save-prefix': '^',
      ...options,
    },
  }) as unknown as LoadedConfig

t.beforeEach(() => {
  requested = []
  archiveStarts = []
  archiveRefreshes = []
  archiveFails = false
  refreshFails = false
})

const names = (result: OutdatedResult) =>
  result.map(e => [e.name, e.dependent])

t.test('reports outdated direct dependencies', async t => {
  const result = await Command.command(makeConfig())
  t.matchSnapshot(result, 'result')
  t.strictSame(
    names(result),
    [
      ['foo', 'my-project'],
      ['missing', 'my-project'],
      ['notag', 'my-project'],
      ['foo-two', 'my-project'],
      ['baz', 'my-project'],
      ['cat', 'my-project'],
      ['tool', 'my-project'],
      ['pre', 'my-project'],
      ['tagged', 'my-project'],
      ['patchy', 'my-project'],
      ['unsat', 'my-project'],
      ['gone', 'my-project'],
      ['pinned', 'my-project'],
      ['foo', 'a'],
      ['cat', 'a'],
      ['tool', 'a'],
    ],
    'only dependencies that are missing or behind are reported',
  )
  t.strictSame(
    requested.sort(),
    [
      'bar',
      'baz',
      'cat',
      'foo',
      'gone',
      'missing',
      'notag',
      'patchy',
      'pinned',
      'pre',
      'react',
      'tagged',
      'tool',
      'unsat',
    ],
    'one packument per registry package, git specs are skipped',
  )
  const byName = Object.fromEntries(
    result
      .filter(e => e.dependent === 'my-project')
      .map(e => [e.name, e]),
  )
  t.match(byName.foo, {
    current: '1.0.0',
    wanted: '1.2.0',
    latest: '2.0.0',
    kind: 'major',
    inRange: true,
    requires: {
      node: '>=99',
      peers: { react: '^19.0.0' },
    },
    action: 'vlt install foo@^2.0.0',
    security: {
      current: { score: 90, alerts: [{ key: 'cve-1' }] },
      wanted: { score: 90, alerts: [] },
      latest: { score: 30, alerts: [{ key: 'mal-1' }] },
    },
  })
  t.notOk(byName.foo?.heldBy, 'direct dependencies are not held')
  t.match(byName.missing, {
    current: undefined,
    wanted: '1.0.0',
    kind: 'missing',
    inRange: true,
    action: 'vlt install',
  })
  t.match(byName.notag, {
    latest: '1.5.0',
    kind: 'minor',
    action: 'vlt update',
  })
  t.notOk(byName.notag?.security, 'no report, no security data')
  t.match(byName['foo-two'], {
    spec: 'npm:foo@^1.0.0',
    action: 'vlt install foo-two@npm:foo@^2.0.0',
  })
  t.match(byName.baz, {
    spec: 'custom:baz@^1.0.0',
    kind: 'minor',
    action: 'vlt update',
    security: { current: { score: 70 }, wanted: { score: 70 } },
  })
  t.match(byName.cat, {
    spec: 'catalog:',
    kind: 'major',
    action: 'set the catalog entry for cat in vlt.json to ^2.0.0',
  })
  t.match(byName.tool, {
    spec: 'catalog:tools',
    action:
      'set the "tools" catalog entry for tool in vlt.json to ^2.0.0',
  })
  t.match(byName.pre, { kind: 'prerelease', action: 'vlt update' })
  t.match(byName.tagged, {
    wanted: '1.1.0',
    latest: '1.0.0',
    kind: 'minor',
    action: 'vlt update',
  })
  t.match(byName.patchy, { kind: 'patch', action: 'vlt update' })
  t.match(byName.unsat, {
    wanted: undefined,
    latest: '1.5.0',
    kind: 'minor',
    inRange: false,
    action: 'vlt install unsat@^1.5.0',
  })
  t.match(byName.gone, { wanted: '1.1.0', latest: '9.9.9' })
  t.notOk(byName.gone?.requires)
  t.match(byName.pinned, {
    type: 'dev',
    kind: 'minor',
    inRange: false,
    deprecated: 'use 1.1.0',
    action: 'vlt install pinned@^1.1.0 --save-dev',
  })
  t.match(
    result.find(e => e.dependent === 'a'),
    {
      name: 'foo',
      location: './packages/a',
      action: 'vlt install foo@^2.0.0 --workspace=packages/a',
    },
  )
  t.equal(archiveStarts.length, 1, 'archive started once')
  t.strictSame(
    archiveStarts[0]?.map(n => n.id).sort(),
    [
      id('baz', '1.0.0', 'custom'),
      id('baz', '1.1.0', 'custom'),
      id('cat', '1.0.0'),
      id('cat', '2.0.0'),
      id('foo', '1.0.0'),
      id('foo', '1.2.0'),
      id('foo', '2.0.0'),
      id('gone', '1.0.0'),
      id('gone', '1.1.0'),
      id('gone', '9.9.9'),
      id('missing', '1.0.0'),
      id('notag', '1.0.0'),
      id('notag', '1.5.0'),
      id('patchy', '1.0.0'),
      id('patchy', '1.0.1'),
      id('pinned', '1.0.0'),
      id('pinned', '1.1.0'),
      id('pre', '2.0.0'),
      id('pre', '2.0.0-beta.1'),
      id('tagged', '1.0.0'),
      id('tagged', '1.1.0'),
      id('tool', '1.0.0'),
      id('tool', '2.0.0'),
      id('unsat', '1.0.0'),
      id('unsat', '1.5.0'),
    ],
    'installed, wanted and latest versions are looked up',
  )
})

t.test('honors the save prefix', async t => {
  const tilde = await Command.command(
    makeConfig({
      positionals: ['pinned'],
      options: { 'save-prefix': '~' },
    }),
  )
  t.equal(tilde[0]?.action, 'vlt install pinned@~1.1.0 --save-dev')
  const exact = await Command.command(
    makeConfig({
      positionals: ['pinned'],
      options: { 'save-exact': true },
    }),
  )
  t.equal(exact[0]?.action, 'vlt install pinned@1.1.0 --save-dev')
})

t.test('filters by package name', async t => {
  const result = await Command.command(
    makeConfig({ positionals: ['foo', 'bar'] }),
  )
  t.strictSame(names(result), [
    ['foo', 'my-project'],
    ['foo', 'a'],
  ])
  t.strictSame(requested.sort(), ['bar', 'foo'])
})

t.test('skips the archive when nothing is outdated', async t => {
  const result = await Command.command(
    makeConfig({ positionals: ['bar'] }),
  )
  t.strictSame(result, [])
  t.strictSame(archiveStarts, [])
})

t.test('limits the report to selected workspaces', async t => {
  const result = await Command.command(
    makeConfig({ values: { workspace: ['packages/a'] } }),
  )
  t.strictSame(names(result), [
    ['foo', 'a'],
    ['cat', 'a'],
    ['tool', 'a'],
  ])
  t.strictSame(requested, ['foo', 'cat', 'tool'])
})

t.test('checks whatever a --target query selects', async t => {
  const result = await Command.command(
    makeConfig({ values: { target: '*' } }),
  )
  t.matchSnapshot(result, 'result')
  const held = result.filter(e => e.name === 'lodash')
  t.strictSame(
    held.map(e => [e.dependent, e.heldBy, e.action]),
    [
      [
        'foo@1.0.0',
        [{ dependent: 'bar@1.0.0', spec: '~1.0.0' }],
        undefined,
      ],
      [
        'bar@1.0.0',
        [{ dependent: 'foo@1.0.0', spec: '^1.0.0' }],
        undefined,
      ],
    ],
    'transitive dependents are named with their version and hold each other',
  )
  t.equal(
    held[0]?.location,
    foo.location,
    'transitive dependents report their own location',
  )
  t.ok(
    result.some(e => e.name === 'missing'),
    'a query that yields dangling edges reports missing dependencies',
  )
  t.equal(
    archiveStarts.length,
    1,
    'the archive is started for the query',
  )
  t.equal(
    archiveStarts[0]?.length,
    graph.nodes.size,
    'with every node in the graph',
  )
  t.equal(
    archiveRefreshes.length,
    1,
    'then refreshed with the candidates',
  )
  t.ok(
    archiveRefreshes[0]?.some(n => n.id === id('foo', '2.0.0')),
    'including stand-in nodes for versions that are not installed',
  )
  t.match(
    result.find(e => e.name === 'foo'),
    {
      security: { latest: { score: 30 } },
    },
  )
})

t.test('carries on without the security archive', async t => {
  archiveFails = true
  const result = await Command.command(
    makeConfig({ positionals: ['foo'] }),
  )
  t.equal(result.length, 2)
  t.ok(result.every(e => e.security === undefined))

  archiveFails = false
  refreshFails = true
  const queried = await Command.command(
    makeConfig({
      positionals: ['foo'],
      values: { target: ':root > *' },
    }),
  )
  t.equal(queried.length, 1)
  t.ok(queried.every(e => e.security === undefined))
})

t.test('requires a vlt install', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })
  await t.rejects(Command.command(makeConfig({ projectRoot })), {
    cause: { code: 'EQUERY' },
  })
  t.strictSame(requested, [], 'no packuments are requested')
})

// the suggested steps that follow the table in the human view
const suggestedLines = (view: string) =>
  view.split('\n\n')[1]?.split('\n') ?? []

t.test('views', async t => {
  const entry = (
    overrides: Partial<OutdatedEntry>,
  ): OutdatedEntry => ({
    name: 'foo',
    spec: '^1.0.0',
    type: 'prod',
    current: '1.0.0',
    wanted: '1.2.0',
    latest: '2.0.0',
    dependent: 'my-project',
    location: '.',
    kind: 'major',
    inRange: true,
    ...overrides,
  })
  const full = await Command.command(makeConfig())
  t.matchSnapshot(
    Command.views.human(full),
    'human view of the full report',
  )
  const transitive = await Command.command(
    makeConfig({ values: { target: '*' }, positionals: ['lodash'] }),
  )
  t.matchSnapshot(
    Command.views.human(transitive),
    'human view of transitive dependencies',
  )
  const single: OutdatedResult = [
    entry({
      security: {
        current: { score: 90, alerts: [alert('a', 'cve', 'high')] },
        latest: { score: 70, alerts: [alert('a', 'cve', 'high')] },
      },
    }),
    entry({
      name: 'bar',
      kind: 'minor',
      inRange: false,
      security: {
        current: { score: 90, alerts: [] },
        wanted: { score: 90, alerts: [] },
        latest: {
          score: 90,
          alerts: [alert('b', 'malware', 'critical')],
        },
      },
    }),
  ]
  t.matchSnapshot(
    Command.views.human(single),
    'human view with a single dependent and no actions',
  )
  t.matchSnapshot(
    Command.views.human([]),
    'human view with nothing outdated',
  )
  const repeated: OutdatedResult = [
    entry({
      action: 'vlt install foo@^2.0.0 --workspace=packages/a',
    }),
    entry({
      action: 'vlt install foo@^2.0.0 --workspace=packages/a',
    }),
    entry({
      action: 'set the catalog entry for cat in vlt.json to ^2.0.0',
    }),
    entry({
      action: 'set the catalog entry for cat in vlt.json to ^2.0.0',
    }),
  ]
  t.strictSame(
    suggestedLines(Command.views.human(repeated)),
    [
      'Run `vlt update` to pick up 4 in-range updates.',
      'Run `vlt install foo@^2.0.0 --workspace=packages/a` to move to latest.',
      'Set the catalog entry for cat in vlt.json to ^2.0.0.',
    ],
    'the same step is suggested once however many entries call for it',
  )
  t.equal(Command.views.count(full), full.length)
  t.equal(Command.views.json(full), full)
})
