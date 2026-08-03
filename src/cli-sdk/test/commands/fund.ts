import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { unload } from '@vltpkg/vlt-json'
import type { SpecOptions } from '@vltpkg/spec'
import type { Test } from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

const sharedOptions = {
  scurry: new PathScurry(),
  packageJson: new PackageJson(),
}

const graph = new Graph.Graph({
  projectRoot: t.testdirName,
  ...specOptions,
  mainManifest: {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
      baz: '^1.0.0',
      'empty-fund': '^1.0.0',
      'no-funding': '^1.0.0',
    },
  },
})
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('foo', '^1.0.0', specOptions),
  {
    name: 'foo',
    version: '1.0.0',
    funding: [
      {
        url: 'https://opencollective.com/foo',
        type: 'opencollective',
      },
    ],
  },
)
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('bar', '^1.0.0', specOptions),
  {
    name: 'bar',
    version: '2.0.0',
    funding: [
      { url: 'https://github.com/sponsors/bar', type: 'github' },
    ],
  },
)
// shares a funding url with foo, plus a second unique url
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('baz', '^1.0.0', specOptions),
  {
    name: 'baz',
    version: '3.0.0',
    funding: [
      {
        url: 'https://opencollective.com/foo',
        type: 'opencollective',
      },
      { url: 'https://patreon.com/baz', type: 'patreon' },
    ],
  },
)
// funding field present but with no usable url -> filtered out
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('empty-fund', '^1.0.0', specOptions),
  {
    name: 'empty-fund',
    version: '1.0.0',
    funding: [{ url: '', type: 'individual' }],
  },
)
// no funding at all
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('no-funding', '^1.0.0', specOptions),
  {
    name: 'no-funding',
    version: '1.0.0',
  },
)

const mockFund = async (
  t: Test,
  { graph: g = graph, ...mocks }: Record<string, any> = {},
) =>
  t.mockImport<typeof import('../../src/commands/fund.ts')>(
    '../../src/commands/fund.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: {
          load: () => g,
        },
      }),
      ...mocks,
    },
  )

const Command = await mockFund(t)

const runCommand = async (
  {
    options = {},
    positionals = [],
    values,
  }: {
    options?: object
    positionals?: string[]
    values: Partial<LoadedConfig['values']> & {
      view: Exclude<LoadedConfig['values']['view'], 'inspect'>
    }
  },
  cmd = Command,
) => {
  const config = {
    options,
    positionals,
    values,
    get: (key: string) => (values as any)[key],
  } as LoadedConfig
  const res = await cmd.command(config)
  const output =
    values.view === 'human' ?
      cmd.views.human(res, { colors: values.color })
    : cmd.views.json(res)
  return values.view === 'json' ?
      JSON.stringify(output, null, 2)
    : output
}

t.test('fund', async t => {
  t.matchSnapshot(Command.usage().usage(), 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: { view: 'human' },
      options,
    }),
    'should list funded pkgs in human readable format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: { view: 'human', color: true },
      options,
    }),
    'should use colors when set in human readable format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: { view: 'json' },
      options,
    }),
    'should list funded pkgs in json format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: ['foo'],
      values: { view: 'human' },
      options,
    }),
    'should scope report to named packages',
  )
})

t.test('no funded dependencies', async t => {
  const emptyGraph = new Graph.Graph({
    projectRoot: t.testdirName,
    ...specOptions,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: { plain: '^1.0.0' },
    },
  })
  emptyGraph.placePackage(
    emptyGraph.mainImporter,
    'prod',
    Spec.parse('plain', '^1.0.0', specOptions),
    { name: 'plain', version: '1.0.0' },
  )

  sharedOptions.packageJson.read = () =>
    emptyGraph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }

  const Command = await mockFund(t, { graph: emptyGraph })

  t.matchSnapshot(
    await runCommand(
      {
        positionals: [],
        values: { view: 'human' },
        options,
      },
      Command,
    ),
    'should report that no funding was found',
  )

  t.equal(
    await runCommand(
      {
        positionals: [],
        values: { view: 'json' },
        options,
      },
      Command,
    ),
    JSON.stringify([], null, 2),
    'should return an empty json array',
  )
})

t.test('no package.json in project root', async t => {
  const dir = t.testdir()
  t.chdir(dir)
  unload()

  const Command = await mockFund(t)
  const options = {
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    projectRoot: dir,
    monorepo: Monorepo.maybeLoad(dir),
  }

  t.strictSame(
    await Command.command({
      options,
      positionals: [],
      values: { view: 'json' },
      get: () => undefined,
    } as unknown as LoadedConfig),
    { reports: [] },
    'should return no reports when there is no graph',
  )
})
