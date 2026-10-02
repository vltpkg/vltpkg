import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import type { Packument } from '@vltpkg/types'
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
} satisfies SpecOptions

const manifest = (name: string, version: string) => ({
  name,
  version,
  dist: {
    tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
  },
})

const packument = (
  name: string,
  versions: string[],
  distTags: Record<string, string> = {
    latest: versions[versions.length - 1] ?? '',
  },
): Packument => ({
  name,
  'dist-tags': distTags,
  versions: Object.fromEntries(
    versions.map(v => [v, manifest(name, v)]),
  ),
})

const packuments: Record<string, Packument> = {
  // behind both wanted and latest
  foo: packument('foo', ['1.0.0', '1.2.0', '2.0.0']),
  // fully up to date
  bar: packument('bar', ['1.0.0']),
  // only behind latest, the pinned spec cannot move
  pinned: packument('pinned', ['1.0.0', '1.1.0']),
  // no `latest` dist-tag, so latest falls back to the highest stable
  notag: packument('notag', ['1.0.0', '1.5.0', '2.0.0-beta.1'], {}),
  // never installed
  missing: packument('missing', ['1.0.0']),
  // served by a named registry
  baz: packument('baz', ['1.0.0', '1.1.0']),
}

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
  dependencies: {
    foo: '^1.0.0',
    bar: '^1.0.0',
    missing: '^1.0.0',
    gitdep: 'github:some/repo',
    notag: '^1.0.0',
    // an alias shares foo's packument
    'foo-two': 'npm:foo@^2.0.0',
    baz: 'custom:baz@^1.0.0',
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
  mani?: ReturnType<typeof manifest>,
) =>
  graph.placePackage(
    from,
    type,
    Spec.parse(name, bareSpec, specOptions),
    mani,
  )
place(mainImporter, 'prod', 'foo', '^1.0.0', manifest('foo', '1.0.0'))
place(mainImporter, 'prod', 'bar', '^1.0.0', manifest('bar', '1.0.0'))
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
  'npm:foo@^2.0.0',
  manifest('foo', '2.0.0'),
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

let requested: string[] = []

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
    },
  )

const Command = await mockCommand(t)

t.matchSnapshot(Command.usage().usageMarkdown())

const makeConfig = ({
  positionals = [],
  values = {},
  projectRoot = dir,
}: {
  positionals?: string[]
  values?: Record<string, unknown>
  projectRoot?: string
} = {}): LoadedConfig =>
  ({
    positionals,
    values,
    options: {
      ...specOptions,
      projectRoot,
      scurry,
      packageJson,
      monorepo,
    },
  }) as unknown as LoadedConfig

t.beforeEach(() => {
  requested = []
})

t.test('reports outdated direct dependencies', async t => {
  const result = await Command.command(makeConfig())
  t.matchSnapshot(result, 'result')
  t.strictSame(
    result.map(e => [e.name, e.dependent]),
    [
      ['foo', 'my-project'],
      ['missing', 'my-project'],
      ['notag', 'my-project'],
      ['baz', 'my-project'],
      ['pinned', 'my-project'],
      ['foo', 'a'],
    ],
    'only dependencies that are missing or behind are reported',
  )
  t.strictSame(
    requested.sort(),
    ['bar', 'baz', 'foo', 'missing', 'notag', 'pinned'],
    'one packument per registry package, git specs are skipped',
  )
  const foo = result.find(e => e.name === 'foo')
  t.strictSame(foo, {
    name: 'foo',
    spec: '^1.0.0',
    type: 'prod',
    current: '1.0.0',
    wanted: '1.2.0',
    latest: '2.0.0',
    dependent: 'my-project',
    location: '.',
  })
  const pinned = result.find(e => e.name === 'pinned')
  t.match(pinned, {
    type: 'dev',
    current: '1.0.0',
    wanted: '1.0.0',
    latest: '1.1.0',
  })
  const notag = result.find(e => e.name === 'notag')
  t.equal(
    notag?.latest,
    '1.5.0',
    'latest falls back to the highest stable version',
  )
  const missing = result.find(e => e.name === 'missing')
  t.match(missing, { current: undefined, wanted: '1.0.0' })
  const ws = result.find(e => e.dependent === 'a')
  t.match(ws, { name: 'foo', location: './packages/a' })
})

t.test('filters by package name', async t => {
  const result = await Command.command(
    makeConfig({ positionals: ['foo', 'bar'] }),
  )
  t.strictSame(
    result.map(e => [e.name, e.dependent]),
    [
      ['foo', 'my-project'],
      ['foo', 'a'],
    ],
  )
  t.strictSame(requested.sort(), ['bar', 'foo'])
})

t.test('limits the report to selected workspaces', async t => {
  const result = await Command.command(
    makeConfig({ values: { workspace: ['packages/a'] } }),
  )
  t.strictSame(
    result.map(e => [e.name, e.dependent]),
    [['foo', 'a']],
  )
  t.strictSame(requested, ['foo'])
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
    ...overrides,
  })
  const multi: OutdatedResult = [
    entry({}),
    entry({
      name: 'missing',
      current: undefined,
      wanted: '1.0.0',
      latest: '1.0.0',
    }),
    entry({
      name: 'pinned',
      spec: '1.0.0',
      type: 'dev',
      wanted: '1.0.0',
      latest: '1.1.0',
    }),
    entry({ dependent: 'a', location: './packages/a' }),
  ]
  const single: OutdatedResult = [entry({})]
  const empty: OutdatedResult = []

  t.matchSnapshot(
    Command.views.human(multi),
    'human view with several dependents',
  )
  t.matchSnapshot(
    Command.views.human(single),
    'human view with a single dependent',
  )
  t.matchSnapshot(
    Command.views.human(empty),
    'human view with nothing outdated',
  )
  t.equal(Command.views.count(multi), 4)
  t.equal(Command.views.json(multi), multi)
})
