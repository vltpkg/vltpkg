import * as Graph from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
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
    values.color ?
      { colors: await import('chalk').then(r => r.default) }
    : {},
    config,
  )
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

  await t.rejects(
    Command.command({
      positionals: ['*:malware'],
      values: { view: 'human' },
      options,
    } as LoadedConfig),
    /Failed to parse :malware selector/,
    'should fail to run with no security archive',
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
      } as LoadedConfig),
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
      } as LoadedConfig),
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
      } as LoadedConfig),
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
      } as LoadedConfig),
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
      } as LoadedConfig),
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
      'vlt-workspaces.json': JSON.stringify({
        packages: ['./packages/*'],
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
    } as unknown as LoadedConfig
    await views.gui(await command(conf), {}, conf)

    t.matchStrict(
      guiConfig,
      { options: { projectRoot: t.testdirName } },
      'should call startGUI with expected options',
    )
  })

  await t.test('colors', async t => {
    t.intercept(process, 'env', {
      value: { ...process.env, FORCE_COLOR: '1' },
    })
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
})
