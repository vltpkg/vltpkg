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
import { join } from 'path'
import { joinDepIDTuple } from '@vltpkg/dep-id'

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
              get: () => undefined,
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
    get: (key: string) => (values as any)[key],
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
    'should list pkgs in mermaid format',
  )

  await t.rejects(
    Command.command({
      positionals: ['*:malware'],
      options,
      get: () => undefined,
    } as unknown as LoadedConfig),
    /Direct queries are not supported as positional arguments/,
    'should reject query syntax in positionals',
  )

  // Test rejecting direct queries in positionals
  await t.rejects(
    Command.command({
      positionals: ['#foo'],
      options,
      get: () => undefined,
    } as unknown as LoadedConfig),
    /Direct queries are not supported as positional arguments/,
    'should reject query starting with #',
  )

  await t.rejects(
    Command.command({
      positionals: ['*'],
      options,
      get: () => undefined,
    } as unknown as LoadedConfig),
    /Direct queries are not supported as positional arguments/,
    'should reject query starting with *',
  )

  await t.rejects(
    Command.command({
      positionals: [':scope'],
      options,
      get: () => undefined,
    } as unknown as LoadedConfig),
    /Direct queries are not supported as positional arguments/,
    'should reject query starting with :',
  )

  await t.rejects(
    Command.command({
      positionals: ['[name="foo"]'],
      options,
      get: () => undefined,
    } as unknown as LoadedConfig),
    /Direct queries are not supported as positional arguments/,
    'should reject attribute selector queries',
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
          values: {
            view: 'human',
            workspace: ['a'],
          },
          options,
        },
        C,
      ),
      'should use specified workspace as scope selector',
    )

    t.matchSnapshot(
      await runCommand(
        {
          values: { view: 'human', scope: ':workspace#a' },
          options,
        },
        C,
      ),
      'should add scope nodes as importers',
    )

    t.matchSnapshot(
      await runCommand(
        {
          values: { view: 'json', scope: ':workspace' },
          options,
        },
        C,
      ),
      'should add all scope nodes as importers',
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

  await t.test('colors', async t => {
    const C = await mockList(t)

    t.matchSnapshot(
      await runCommand(
        {
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

  await t.test('default query string selection logic', async t => {
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
            name: 'workspace-a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: 'workspace-b',
            version: '1.0.0',
          }),
        },
      },
      node_modules: {
        a: t.fixture('symlink', '../packages/a'),
        b: t.fixture('symlink', '../packages/a'),
      },
    })
    t.chdir(dir)
    unload()

    const monorepo = Monorepo.load(dir)
    const graph = Graph.actual.load({
      monorepo,
      packageJson: new PackageJson(),
      scurry: new PathScurry(),
      projectRoot: dir,
      ...specOptions,
    })

    const Command = await mockList(t, { graph })
    const result = await runCommand(
      {
        positionals: [], // No positionals to test default query logic
        values: {
          view: 'human',
          scope: '#a', // Should trigger the default selection logic
        },
        options,
      },
      Command,
    )

    t.matchSnapshot(
      result,
      'should select the correct workspace based on default query logic',
    )
  })

  await t.test('scope with workspaces', async t => {
    // Create a more realistic test with actual graph nodes
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
            name: 'workspace-a',
            version: '1.0.0',
          }),
        },
      },
    })
    t.chdir(dir)

    const monorepo = Monorepo.load(dir)
    const graph = Graph.actual.load({
      monorepo,
      packageJson: new PackageJson(),
      scurry: new PathScurry(),
      projectRoot: dir,
      ...specOptions,
    })

    const Command = await mockList(t, { graph })

    const result = await runCommand(
      {
        values: {
          scope: ':workspace',
          view: 'human',
        },
        options,
      },
      Command,
    )

    t.matchSnapshot(
      result,
      'should handle scope with workspaces correctly',
    )
  })

  await t.test('scope with a transitive dependency', async t => {
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
            name: 'workspace-a',
            version: '1.0.0',
            dependencies: {
              foo: '^1.0.0',
            },
          }),
        },
      },
      node_modules: {
        '.vlt': {
          [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
            node_modules: {
              foo: {
                'package.json': JSON.stringify({
                  name: 'foo',
                  version: '1.0.0',
                  dependencies: {
                    bar: '^1.0.0',
                  },
                }),
              },
              bar: t.fixture(
                'symlink',
                join(
                  '../../',
                  joinDepIDTuple(['registry', '', 'bar@1.0.0']),
                  'node_modules/bar',
                ),
              ),
            },
          },
          [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: {
            node_modules: {
              bar: {
                'package.json': JSON.stringify({
                  name: 'bar',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        foo: t.fixture(
          'symlink',
          join(
            '.vlt',
            joinDepIDTuple(['registry', '', 'foo@1.0.0']),
            'node_modules',
            'foo',
          ),
        ),
        bar: t.fixture(
          'symlink',
          join(
            '.vlt',
            joinDepIDTuple(['registry', '', 'bar@1.0.0']),
            'node_modules',
            'bar',
          ),
        ),
      },
    })
    t.chdir(dir)

    const monorepo = Monorepo.load(dir)
    const graph = Graph.actual.load({
      monorepo,
      packageJson: new PackageJson(),
      scurry: new PathScurry(),
      projectRoot: dir,
      ...specOptions,
    })

    const Command = await mockList(t, { graph })

    const result = await runCommand(
      {
        values: {
          scope: '#foo',
          view: 'human',
        },
        options,
      },
      Command,
    )

    t.matchSnapshot(
      result,
      'should handle scope with a transitive dependency',
    )
  })

  // Test that package names still work correctly
  await t.test('package names as positionals', async t => {
    t.matchSnapshot(
      await runCommand({
        positionals: ['foo'],
        values: { view: 'human' },
        options,
      }),
      'should accept simple package name',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: ['@scoped/package'],
        values: { view: 'human' },
        options,
      }),
      'should accept scoped package name',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: ['package-with-dashes'],
        values: { view: 'human' },
        options,
      }),
      'should accept package name with dashes',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: ['123numeric'],
        values: { view: 'human' },
        options,
      }),
      'should accept package name starting with numbers',
    )
  })
})
