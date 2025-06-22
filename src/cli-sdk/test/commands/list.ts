import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
    custom: 'https://example.com',
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
      '@foo/bazz': '^1.0.0',
      bar: '^1.0.0',
      missing: '^1.0.0',
    },
  },
})
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('@foo/bazz', '^1.0.0', specOptions),
  {
    name: '@foo/bazz',
    version: '1.0.0',
  },
)
const bar = graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('bar', '^1.0.0', specOptions),
  {
    name: 'bar',
    version: '1.0.0',
    dependencies: {
      baz: '^1.0.0',
    },
  },
)!
const baz = graph.placePackage(
  bar,
  'prod',
  Spec.parse('baz', 'custom:baz@^1.0.0', specOptions),
  {
    name: 'baz',
    version: '1.0.0',
    dist: {
      tarball: 'https://registry.vlt.sh/baz',
    },
  },
)!
graph.placePackage(
  graph.mainImporter,
  'prod',
  Spec.parse('missing', '^1.0.0', specOptions),
)
graph.placePackage(
  baz,
  'prod',
  Spec.parse('@foo/bazz', '^1.0.0', specOptions),
  {
    name: '@foo/bazz',
    version: '1.0.0',
  },
)

const mockList = async (
  t: Test,
  { graph: g = graph, ...mocks }: Record<string, any> = {},
) =>
  t.mockImport<typeof import('../../src/commands/list.ts')>(
    '../../src/commands/list.ts',
    {
      '@vltpkg/graph': t.createMock(Graph, {
        actual: {
          load: () => g,
        },
        install: () => {},
        uninstall: () => {},
        reify: {},
        ideal: {},
        asDependency: () => {},
      }),
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return {
              ok: false,
            }
          },
        },
      },
      ...mocks,
    },
  )

const Command = await mockList(t)

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
  } as LoadedConfig
  const res = await cmd.command(config)
  const output = cmd.views[values.view](
    res,
    { colors: values.color },
    config,
  )
  return values.view === 'json' ?
      JSON.stringify(output, null, 2)
    : output
}

t.test('list', async t => {
  t.matchSnapshot(Command.usage().usage(), 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }

  t.matchSnapshot(
    await runCommand({
      values: { view: 'human' },
      options,
    }),
    'should list pkgs in human readable format',
  )

  t.matchSnapshot(
    await runCommand({
      values: { view: 'json' },
      options,
    }),
    'should list pkgs in json format',
  )

  t.matchSnapshot(
    await runCommand({
      values: { view: 'mermaid' },
      options,
    }),
    'should list mermaid in json format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: ['*'],
      values: { view: 'human' },
      options,
    }),
    'should list all pkgs in human readable format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: ['*'],
      values: { view: 'json' },
      options,
    }),
    'should list all pkgs in json format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: ['*'],
      values: { view: 'mermaid' },
      options,
    }),
    'should list all pkgs in mermaid format',
  )

  await t.rejects(
    Command.command({
      positionals: ['*:malware'],
      options,
    } as LoadedConfig),
    /Failed to parse :malware selector/,
    'should fail to run with no security archive',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: ['@foo/bazz', 'bar'],
      values: { view: 'human' },
      options,
    }),
    'should list all pkgs in human format',
  )

  await t.test('workspaces', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['./packages/*'] },
      }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'b',
            version: '1.0.0',
          }),
        },
      },
    })
    t.chdir(dir)
    unload()

    const monorepo = Monorepo.load(dir)
    const graph = new Graph.Graph({
      ...specOptions,
      projectRoot: dir,
      mainManifest,
      monorepo,
    })

    sharedOptions.packageJson.read = () => mainManifest
    const options = {
      ...sharedOptions,
      projectRoot: dir,
      monorepo,
    }

    const C = await mockList(t, { graph })

    t.matchSnapshot(
      await runCommand(
        {
          values: { view: 'human' },
          options,
        },
        C,
      ),
      'should list workspaces in human readable format',
    )

    t.matchSnapshot(
      await runCommand(
        {
          values: { view: 'json' },
          options,
        },
        C,
      ),
      'should list workspaces in json format',
    )

    t.matchSnapshot(
      await runCommand(
        {
          values: { view: 'human', workspace: ['a'] },
          options,
        },
        C,
      ),
      'should list single workspace',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [':scope'],
          values: { view: 'human', workspace: ['a'] },
          options,
        },
        C,
      ),
      'should use specified workspace as scope selector',
    )
  })

  t.test('view=gui', async t => {
    sharedOptions.packageJson.read = () =>
      graph.mainImporter.manifest!
    const options = {
      ...sharedOptions,
      projectRoot: t.testdirName,
    }

    let vltServerOptions: LoadedConfig | undefined = undefined
    const C = await mockList(t, {
      '../../src/start-gui.ts': {
        startGUI: async (conf: LoadedConfig) => {
          vltServerOptions = conf
        },
      },
    })

    await runCommand(
      {
        positionals: [],
        values: {
          workspace: [],
          view: 'gui',
        },
        options,
      },
      C,
    )

    t.matchStrict(
      vltServerOptions,
      { options: { projectRoot: t.testdirName } },
      'should call startGUI with expected options',
    )
  })

  await t.test('security insights populated for all queries', async t => {
    let populateAllNodeInsightsCalled = false
    
    const mockSecurityArchive = {
      ok: true,
      packageReports: new Map(),
    }
    
    const Command = await mockList(t, {
      '@vltpkg/security-archive': {
        SecurityArchive: {
          async start() {
            return mockSecurityArchive
          },
        },
      },
      '@vltpkg/query': {
        Query: class MockQuery {
          constructor() {}
          populateAllNodeInsights() {
            populateAllNodeInsightsCalled = true
          }
          async search() {
            return { nodes: [], edges: [] }
          }
          static hasSecuritySelectors() {
            return false
          }
        },
      },
    })

    await Command.command({
      positionals: ['*'],
      values: { view: 'json' },
      options,
    } as LoadedConfig)

    t.ok(populateAllNodeInsightsCalled, 'populateAllNodeInsights should be called even for non-security queries')
  })

  await t.test('colors', async t => {
    const C = await mockList(t)

    t.matchSnapshot(
      await runCommand(
        {
          positionals: ['*'],
          values: {
            color: true,
            view: 'human',
          },
          options,
        },
        C,
      ),
      'should use colors when set in human readable format',
    )
  })
})
