import {
  Graph,
  humanReadableOutput,
  jsonOutput,
  mermaidOutput,
} from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { LoadedConfig } from '../../src/types.js'

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

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/list.js')
>('../../src/commands/list.js', {
  '@vltpkg/graph': {
    actual: {
      load: () => graph,
    },
    humanReadableOutput,
    jsonOutput,
    mermaidOutput,
  },
})

t.test('list', async t => {
  t.matchSnapshot(usage, 'should have usage')

  sharedOptions.packageJson.read = () => graph.mainImporter.manifest!
  const options = {
    ...sharedOptions,
    projectRoot: t.testdirName,
  }
  const logs = t.capture(console, 'log').args

  await command({
    positionals: [],
    values: { view: 'human' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(
    logs()[0],
    'should list pkgs in human readable format',
  )

  await command({
    positionals: [],
    values: { view: 'json' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(logs()[0], 'should list pkgs in json format')

  await command({
    positionals: [],
    values: { view: 'mermaid' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(logs()[0], 'should list mermaid in json format')

  await command({
    positionals: ['*'],
    values: { view: 'human' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(
    logs()[0],
    'should list all pkgs in human readable format',
  )

  await command({
    positionals: ['*'],
    values: { view: 'json' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(logs()[0], 'should list all pkgs in json format')

  await command({
    positionals: ['*'],
    values: { view: 'mermaid' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(logs()[0], 'should list all pkgs in mermaid format')

  await command({
    positionals: ['foo', 'bar'],
    values: { view: 'human' },
    options,
  } as unknown as LoadedConfig)
  t.matchSnapshot(logs()[0], 'should list all pkgs in human format')

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

    const { command } = await t.mockImport<
      typeof import('../../src/commands/list.js')
    >('../../src/commands/list.js', {
      '@vltpkg/graph': {
        actual: {
          load: () => graph,
        },
        humanReadableOutput,
        jsonOutput,
        mermaidOutput,
      },
    })

    await command({
      positionals: [],
      values: {
        view: 'human',
      },
      options,
    } as unknown as LoadedConfig)
    t.matchSnapshot(
      logs()[0],
      'should list workspaces in human readable format',
    )

    await command({
      positionals: [],
      values: {
        view: 'json',
      },
      options,
    } as unknown as LoadedConfig)
    t.matchSnapshot(
      logs()[0],
      'should list workspaces in json format',
    )

    await command({
      positionals: [],
      values: {
        workspace: ['a'],
        view: 'human',
      },
      options,
    } as unknown as LoadedConfig)
    t.matchSnapshot(logs()[0], 'should list single workspace')
  })

  process.env.FORCE_COLOR = '1'
  await t.test('colors', async t => {
    const { command } = await t.mockImport<
      typeof import('../../src/commands/list.js')
    >('../../src/commands/list.js', {
      '@vltpkg/graph': {
        actual: {
          load: () => graph,
        },
        humanReadableOutput,
        jsonOutput,
        mermaidOutput,
      },
    })
    await command({
      positionals: ['*'],
      values: {
        color: true,
        view: 'human',
      },
      options,
    } as unknown as LoadedConfig)
    t.matchSnapshot(
      logs()[0],
      'should use colors when set in human readable format',
    )
  })
  delete process.env.FORCE_COLOR
})
