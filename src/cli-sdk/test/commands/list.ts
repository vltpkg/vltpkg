import { join, resolve } from 'node:path'
import t from 'tap'
import { PathScurry } from 'path-scurry'
import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { joinDepIDTuple } from '@vltpkg/dep-id'
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
    values.view === 'silent' ? undefined
    : values.view === 'human' ?
      cmd.views.human(res, { colors: values.color })
    : values.view === 'mermaid' ? cmd.views.mermaid(res)
    : values.view === 'count' ? cmd.views.count(res)
    : cmd.views.json(res)
  return values.view === 'json' ?
      JSON.stringify(output, null, 2)
    : output
}

t.test('list', async t => {
  t.matchSnapshot(Command.usage().usage(), 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    // the list command requires a vlt install
    projectRoot: t.testdir({ node_modules: { '.vlt': {} } }),
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

  t.equal(
    await runCommand({
      values: { view: 'count' },
      options,
    }),
    2,
    'should list pkgs count',
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
      // the list command requires a vlt install
      node_modules: { '.vlt': {} },
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

  await t.test('running from homedir', async t => {
    const dir = t.testdir({
      // the list command requires a vlt install
      node_modules: { '.vlt': {} },
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
          positionals: [],
          values: {
            target: `:host("file:${projectFolder}")`,
            view: 'human',
          },
          options,
        },
        Command,
      ),
      'should read project from host context',
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
        // the list command requires a vlt install
        '.vlt': {},
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
      // the list command requires a vlt install
      node_modules: { '.vlt': {} },
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
        values: { view: 'human', target: '#bar' },
        options,
      }),
      'should accept ID selector',
    )

    t.matchSnapshot(
      await runCommand({
        positionals: [],
        values: { view: 'human', target: '[name="bar"]' },
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
        positionals: ['foo'],
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

t.test('install validation', async t => {
  const mainManifest = { name: 'my-project', version: '1.0.0' }
  const fixture = {
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': JSON.stringify({}),
  }

  const run = async (
    t: Test,
    dir: string,
    values: Partial<LoadedConfig['values']> & { target?: string },
  ) => {
    const Command = await mockList(t)
    const packageJson = new PackageJson()
    packageJson.read = () => mainManifest
    return Command.command({
      positionals: [],
      values: { view: 'count', ...values },
      options: { ...sharedOptions, packageJson, projectRoot: dir },
      get: (key: string) => (values as any)[key],
    } as unknown as LoadedConfig)
  }

  await t.test('node_modules not installed by vlt', async t => {
    const dir = t.testdir({ ...fixture, node_modules: { foo: {} } })
    await t.rejects(
      run(t, dir, { view: 'count' }),
      {
        message:
          'node_modules was not installed by vlt: run `vlt install` to rebuild it before running `vlt ls`, or use `:host()` to query another project',
        cause: { code: 'EQUERY', path: join(dir, 'node_modules') },
      },
      'should refuse to list a node_modules vlt did not install',
    )
  })

  await t.test('no node_modules at all', async t => {
    const dir = t.testdir(fixture)
    await t.rejects(
      run(t, dir, { view: 'count' }),
      {
        message:
          'Project is not installed: run `vlt install` to build the graph that `vlt ls` reads',
        cause: { code: 'EQUERY', path: join(dir, 'node_modules') },
      },
      'should refuse to list a project that was never installed',
    )
  })

  await t.test('vlt store present', async t => {
    const dir = t.testdir({
      ...fixture,
      node_modules: { '.vlt': {} },
    })
    await t.resolves(run(t, dir, { view: 'count' }))
  })

  await t.test('host context queries are exempt', async t => {
    const dir = t.testdir(fixture)
    for (const values of [
      { target: ':host(local) *' },
      { scope: ':host(local) *' },
    ]) {
      await t.resolves(
        run(t, dir, values as Partial<LoadedConfig['values']>),
        `should not require an install for ${JSON.stringify(values)}`,
      )
    }
  })
})
