import { join, resolve } from 'node:path'
import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import type { SpecOptions } from '@vltpkg/spec'
import type { Test } from 'tap'
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
      foo: '^1.0.0',
      bar: '^1.0.0',
      missing: '^1.0.0',
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
  Spec.parse('foo', '^1.0.0', specOptions),
  {
    name: 'foo',
    version: '1.0.0',
  },
)

const mockQuery = async (
  t: Test,
  { graph: g = graph, ...mocks }: Record<string, any> = {},
) =>
  t.mockImport<typeof import('../../src/commands/query.ts')>(
    '../../src/commands/query.ts',
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

const Command = await mockQuery(t)

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
      target?: string
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
    values.view === 'silent' ?
      undefined
    : cmd.views[values.view](res, { colors: values.color }, config)
  return values.view === 'json' ?
      JSON.stringify(output, null, 2)
    : output
}

t.test('query', async t => {
  t.matchSnapshot(Command.usage().usage(), 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: {
        view: 'human',
      },
      options,
    }),
    'should list pkgs in human readable format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: {
        view: 'json',
      },
      options,
    }),
    'should list pkgs in json format',
  )

  t.matchSnapshot(
    await runCommand({
      positionals: [],
      values: {
        view: 'mermaid',
      },
      options,
    }),
    'should list mermaid in json format',
  )

  await t.test('expect-results option', async t => {
    t.matchSnapshot(
      await runCommand({
        positionals: ['*'],
        values: {
          'expect-results': '>0',
          view: 'human',
        },
        options,
      }),
      'should return items when expect-results check passes',
    )

    t.ok(
      await runCommand({
        positionals: ['*'],
        values: {
          'expect-results': '>=  5',
          view: 'human',
        },
        options,
      }),
      'should pass gte checks',
    )

    await t.rejects(
      Command.command({
        positionals: ['[version="2.0.0"]'],
        values: {
          'expect-results': '>1',
          view: 'human',
        },
        options,
        get: () => undefined,
      } as unknown as LoadedConfig),
      /Unexpected number of items/,
      'should fail validation for gt check',
    )

    await t.rejects(
      Command.command({
        positionals: ['*'],
        values: {
          'expect-results': '>=1000',
          view: 'human',
        },
        options,
        get: () => undefined,
      } as unknown as LoadedConfig),
      /Unexpected number of items/,
      'should fail validation for gte check',
    )

    await t.rejects(
      Command.command({
        positionals: ['*'],
        values: {
          'expect-results': '<3',
          view: 'human',
        },
        options,
        get: () => undefined,
      } as unknown as LoadedConfig),
      /Unexpected number of items/,
      'should fail validation for lt check',
    )

    await t.rejects(
      Command.command({
        positionals: ['*'],
        values: {
          'expect-results': '<=1',
          view: 'human',
        },
        options,
        get: () => undefined,
      } as unknown as LoadedConfig),
      /Unexpected number of items/,
      'should fail validation for lte check',
    )

    await t.rejects(
      Command.command({
        positionals: ['*'],
        values: {
          'expect-results': '500',
          view: 'human',
        },
        options,
        get: () => undefined,
      } as unknown as LoadedConfig),
      /Unexpected number of items/,
      'should fail validation for exact numeric value check',
    )
  })

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

    const Command = await mockQuery(t, { graph })

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [],
          values: {
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should list workspaces in human readable format',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [],
          values: {
            view: 'json',
          },
          options,
        },
        Command,
      ),
      'should list workspaces in json format',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [],
          values: {
            workspace: ['a'],
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should list single workspace',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [':scope'],
          values: {
            workspace: ['a'],
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should use specified workspace as scope selector',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: ['*'],
          values: {
            scope: ':workspace#a',
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should add scope nodes as importers',
    )

    t.matchSnapshot(
      await runCommand(
        {
          positionals: ['*'],
          values: {
            scope: ':workspace',
            view: 'json',
          },
          options,
        },
        Command,
      ),
      'should add all scope nodes as importers',
    )
  })

  await t.test('running from homedir', async t => {
    const dir = t.testdir({
      projects: {
        'my-project': {
          node_modules: {
            '.vlt': {},
          },
          'package.json': JSON.stringify({
            name: 'my-project',
            version: '1.0.0',
          }),
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
          },
        },
      },
    })
    t.chdir(dir)
    unload()

    const Command = await t.mockImport<
      typeof import('../../src/commands/query.ts')
    >('../../src/commands/query.ts')
    const options = {
      ['dashboard-root']: [resolve(dir, 'projects')],
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      projectRoot: dir,
      monorepo: Monorepo.maybeLoad(
        resolve(dir, 'projects/my-project'),
      ),
    }

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [],
          values: {
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should list all projects deps',
    )

    const projectFolder = options.scurry.resolvePosix(
      resolve(dir, 'projects/my-project'),
    )
    t.matchSnapshot(
      await runCommand(
        {
          positionals: [`:host("file:${projectFolder}")`],
          values: {
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should read project from host context',
    )
  })

  t.test('view=gui', async t => {
    sharedOptions.packageJson.read = () =>
      graph.mainImporter.manifest!
    const options = {
      ...sharedOptions,
      projectRoot: t.testdirName,
    }

    let guiConfig: LoadedConfig | undefined
    const { command, views } = await mockQuery(t, {
      '../../src/start-gui.ts': {
        startGUI: async (conf: LoadedConfig) => {
          guiConfig = conf
        },
      },
    })

    const conf = {
      positionals: [],
      values: {
        workspace: [],
        view: 'gui',
      },
      options,
      get: () => undefined,
    } as unknown as LoadedConfig
    await views.gui(await command(conf), {}, conf)

    t.matchStrict(
      guiConfig,
      { options: { projectRoot: t.testdirName } },
      'should call startGUI with expected options',
    )
  })

  await t.test('colors', async t => {
    const Command = await mockQuery(t)

    t.matchSnapshot(
      await runCommand(
        {
          positionals: [],
          values: {
            color: true,
            view: 'human',
          },
          options,
        },
        Command,
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

    const Command = await mockQuery(t, { graph })
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

    const Command = await mockQuery(t, { graph })

    const result = await runCommand(
      {
        positionals: ['*'],
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

    const Command = await mockQuery(t, { graph })

    const result = await runCommand(
      {
        positionals: ['*'],
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

  // Test --target option functionality
  await t.test('--target option', async t => {
    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: '*' },
        options,
      }),
      'should accept wildcard selector',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: '#foo' },
        options,
      }),
      'should accept ID selector',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: '[name="foo"]' },
        options,
      }),
      'should accept attribute selector',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: ':project > *' },
        options,
      }),
      'should accept combinator selectors',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: ':root > :prod' },
        options,
      }),
      'should accept pseudo-element selectors',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'json', target: ':project' },
        options,
      }),
      'should work with json output',
    )

    // Test that --target takes precedence over positional arguments
    t.matchSnapshot(
      await runCommand({
        positionals: ['#bar'],
        values: { view: 'human', target: '*' },
        options,
      }),
      'should use --target over positional arguments',
    )

    // Test complex queries
    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: ':project, :project > *' },
        options,
      }),
      'should handle complex query string',
    )
  })
})
