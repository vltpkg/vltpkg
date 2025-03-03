import {
  Graph,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
} from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { CommandResultOptions } from '../fixtures/run.ts'
import { commandView } from '../fixtures/run.ts'

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

const graph = new Graph({
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
      '@vltpkg/graph': {
        actual: {
          load: () => g,
        },
        install: () => {},
        uninstall: () => {},
        humanReadableOutput,
        jsonOutput,
        mermaidOutput,
        reify: {},
        ideal: {},
        asDependency: () => {},
      },
      ...mocks,
    },
  )

const Command = await mockQuery(t)

const runCommand = async (
  t: Test,
  o: CommandResultOptions,
  cmd: typeof Command = Command,
) => commandView(t, cmd, o)

t.test('query', async t => {
  t.matchSnapshot(Command.usage().usage(), 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }

  t.matchSnapshot(
    await runCommand(t, {
      positionals: [],
      values: {
        view: 'human',
      },
      options,
    }),
    'should list pkgs in human readable format',
  )

  t.matchSnapshot(
    await runCommand(t, {
      positionals: [],
      values: {
        view: 'json',
      },
      options,
    }),
    'should list pkgs in json format',
  )

  t.matchSnapshot(
    await runCommand(t, {
      positionals: [],
      values: {
        view: 'mermaid',
      },
      options,
    }),
    'should list mermaid in json format',
  )

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
    const graph = new Graph({
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
        t,
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
        t,
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
        t,
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
        t,
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
