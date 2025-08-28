import { PackageJson } from '@vltpkg/package-json'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import t from 'tap'
import * as Command from '../../src/commands/pkg.ts'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ViewOptions } from '../../src/view.ts'
import { setupEnv } from '../fixtures/util.ts'

const kNewline = Symbol.for('newline')
const kIndent = Symbol.for('indent')

const readPackageJson = (dir: string) =>
  readFileSync(join(dir, 'package.json'), 'utf8')

const makeTestConfig = (config: any): LoadedConfig =>
  ({
    ...config,
    get: (key: string) => config.values?.[key],
  }) as unknown as LoadedConfig

setupEnv(t)

t.matchSnapshot(Command.usage().usage(), 'usage')

t.test('basic', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify({}),
  })
  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
    positionals: ['gett'],
  })
  t.chdir(dir)
  await t.rejects(Command.command(config), {
    cause: {
      code: 'EUSAGE',
      found: 'gett',
      validOptions: ['get', 'set', 'rm'],
    },
  })
})

t.test('init', async t => {
  const dir = t.testdir()
  t.chdir(dir)

  const C = await t.mockImport<
    typeof import('../../src/commands/pkg.ts')
  >('../../src/commands/pkg.ts', {
    '@vltpkg/init': await t.mockImport<typeof import('@vltpkg/init')>(
      '@vltpkg/init',
      {
        '@vltpkg/git': {
          async getUser() {
            return {
              name: 'Ruy',
              email: 'ruy@example.com',
            }
          },
        },
      },
    ),
  })

  await C.command({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
    positionals: ['init'],
  } as LoadedConfig)
  t.matchSnapshot(
    readPackageJson(dir),
    'should init a new package.json file',
  )
})

t.test('get', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  }
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify(pkg),
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  })
  t.chdir(dir)

  t.strictSame(
    await Command.command(
      Object.assign(config, {
        positionals: ['get'],
      }) as LoadedConfig,
    ),
    { ...pkg, [kNewline]: '', [kIndent]: '' },
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['get', 'name'],
      }) as LoadedConfig,
    ),
    'package-name',
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['get', 'nested.keywords[3].obj[1]'],
      }) as LoadedConfig,
    ),
    'arrays',
  )

  await t.rejects(
    Command.command(
      Object.assign({}, config, {
        positionals: ['get', 'name', 'version'],
      }) as LoadedConfig,
    ),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('pick', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  }

  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify(pkg),
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  })
  t.chdir(dir)

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['pick'],
      }) as LoadedConfig,
    ),
    { ...pkg, [kNewline]: '', [kIndent]: '' },
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['pick', 'name'],
      }) as LoadedConfig,
    ),
    { name: 'package-name' },
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['pick', 'nested.keywords[3].obj[1]'],
      }) as LoadedConfig,
    ),
    {
      nested: {
        keywords: [null, null, null, { obj: [null, 'arrays'] }],
      },
    },
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['pick', 'nested.keywords'],
      }) as LoadedConfig,
    ),
    {
      nested: {
        keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
      },
    },
  )

  t.strictSame(
    await Command.command(
      Object.assign({}, config, {
        positionals: ['pick', 'name', 'version'],
      }) as LoadedConfig,
    ),
    {
      name: pkg.name,
      version: pkg.version,
    },
  )

  await t.test('get from workspace directory', async t => {
    const dir = t.testdir({
      'my-project': {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
        }),
        packages: {
          a: {
            'package.json': JSON.stringify({
              name: 'workspace-a',
              version: '2.0.0',
            }),
          },
        },
      },
    })
    t.chdir(join(dir, 'my-project', 'packages', 'a'))

    t.strictSame(
      await Command.command(
        Object.assign({}, config, {
          positionals: ['get', 'name'],
        }) as LoadedConfig,
      ),
      'workspace-a',
      'should get name from workspace directory',
    )
  })

  await t.test(
    'defaults to projectRoot if no package.json could be found',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
        }),
      })
      const config = makeTestConfig({
        projectRoot: dir,
        options: { packageJson: new PackageJson() },
        positionals: ['get'],
      })

      config.options.packageJson.find = () => undefined

      t.strictSame(
        await Command.command(
          Object.assign({}, config, {
            positionals: ['get', 'name'],
          }) as LoadedConfig,
        ),
        'my-project',
        'should default to the project root location',
      )
    },
  )
})

t.test('set', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
  }

  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify(pkg),
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  })
  t.chdir(dir)

  await Command.command(
    Object.assign({}, config, {
      positionals: ['set', 'name=new-package-name'],
    }) as LoadedConfig,
  )
  t.strictSame(JSON.parse(readPackageJson(dir)), {
    name: 'new-package-name',
    version: '1.0.0',
    description: 'This is the desc',
  })

  await t.rejects(
    Command.command(
      Object.assign({}, config, {
        positionals: ['set'],
      }) as LoadedConfig,
    ),
    { cause: { code: 'EUSAGE' } },
  )

  await t.rejects(
    Command.command(
      Object.assign({}, config, {
        positionals: ['set', 'name'],
      }) as LoadedConfig,
    ),
    { cause: { code: 'EUSAGE' } },
  )

  await t.test('set to a workspace directory', async t => {
    const dir = t.testdir({
      'my-project': {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
        }),
        packages: {
          a: {
            'package.json': JSON.stringify({
              name: 'workspace-a',
              version: '2.0.0',
            }),
          },
        },
      },
    })
    t.chdir(join(dir, 'my-project', 'packages', 'a'))

    await Command.command(
      Object.assign({}, config, {
        positionals: ['set', 'foo=bar'],
      }) as LoadedConfig,
    )

    t.strictSame(
      JSON.parse(
        readPackageJson(join(dir, 'my-project', 'packages', 'a')),
      ),
      {
        name: 'workspace-a',
        version: '2.0.0',
        foo: 'bar',
      },
    )
  })
})

t.test('delete', async t => {
  const pkg = {
    name: 'package-name',
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
    },
  }

  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify(pkg),
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  })
  t.chdir(dir)

  await Command.command(
    Object.assign({}, config, {
      positionals: ['rm', 'name'],
    }) as LoadedConfig,
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['rm', 'nested.keywords[3].obj[0]'],
    }) as LoadedConfig,
  )

  t.strictSame(JSON.parse(readPackageJson(dir)), {
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['arrays'] }],
    },
  })

  await t.rejects(
    Command.command(
      Object.assign({}, config, {
        positionals: ['rm'],
      }) as LoadedConfig,
    ),
    { cause: { code: 'EUSAGE' } },
  )

  await t.test('delete from a workspace directory', async t => {
    const dir = t.testdir({
      'my-project': {
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
        }),
        packages: {
          a: {
            'package.json': JSON.stringify({
              name: 'workspace-a',
              version: '2.0.0',
              foo: 'bar',
            }),
          },
        },
      },
    })
    t.chdir(join(dir, 'my-project', 'packages', 'a'))

    await Command.command(
      Object.assign({}, config, {
        positionals: ['rm', 'foo'],
      }) as LoadedConfig,
    )

    t.strictSame(
      JSON.parse(
        readPackageJson(join(dir, 'my-project', 'packages', 'a')),
      ),
      {
        name: 'workspace-a',
        version: '2.0.0',
      },
    )
  })
})

t.test('scope functionality', async t => {
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
          version: '2.0.0',
          description: 'Workspace A description',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'workspace-b',
          version: '3.0.0',
          description: 'Workspace B description',
        }),
      },
    },
  })
  t.chdir(dir)

  const mockGraph = {
    nodes: new Map([
      [
        'workspace-a-id',
        { name: 'workspace-a', location: 'packages/a' },
      ],
      [
        'workspace-b-id',
        { name: 'workspace-b', location: 'packages/b' },
      ],
    ]),
  }

  const mockQuery = {
    search: async (_queryString: string) => ({
      nodes: [
        {
          id: 'workspace-a-id',
          location: 'packages/a',
          name: 'workspace-a',
          toJSON: () => ({
            location: 'packages/a',
          }),
        },
        {
          id: 'workspace-b-id',
          location: 'packages/b',
          name: 'workspace-b',
          toJSON: () => ({
            location: 'packages/b',
          }),
        },
      ],
    }),
  }

  const Command = await t.mockImport<
    typeof import('../../src/commands/pkg.ts')
  >('../../src/commands/pkg.ts', {
    '@vltpkg/graph': {
      actual: {
        load: () => mockGraph,
      },
      GraphModifier: {
        maybeLoad: () => undefined,
      },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors() {
          return false
        }
        search = mockQuery.search
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => undefined,
      },
    },
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: {
      packageJson: new PackageJson(),
      projectRoot: dir,
    },
    values: {
      scope: ':workspace',
    },
  })

  const getResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['get', 'name'],
    }) as LoadedConfig,
  )

  t.strictSame(
    getResult,
    ['workspace-a', 'workspace-b'],
    'should get name from multiple manifests via scope',
  )

  const pickResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['pick', 'name', 'version'],
    }) as LoadedConfig,
  )

  t.strictSame(
    pickResult,
    [
      { name: 'workspace-a', version: '2.0.0' },
      { name: 'workspace-b', version: '3.0.0' },
    ],
    'should pick from multiple manifests via scope',
  )

  const pickAllResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['pick'],
    }) as LoadedConfig,
  )

  t.strictSame(
    Array.isArray(pickAllResult),
    true,
    'should return array for multiple manifests pick with no args',
  )
  t.strictSame(
    (pickAllResult as any[])[0].name,
    'workspace-a',
    'should return full manifest for first workspace',
  )
  t.strictSame(
    (pickAllResult as any[])[1].name,
    'workspace-b',
    'should return full manifest for second workspace',
  )

  try {
    await Command.command(
      Object.assign({}, config, {
        positionals: ['get'],
      }) as LoadedConfig,
    )
  } catch {}

  const mockQuery2 = {
    search: async (_queryString: string) => ({
      nodes: [
        {
          id: 'workspace-a-id',
          location: 'packages/a',
          name: 'workspace-a',
          toJSON: () => ({
            location: 'packages/a',
          }),
        },
        {
          id: 'workspace-b-id',
          location: 'packages/b',
          name: 'workspace-b',
          toJSON: () => ({
            location: 'packages/b',
          }),
        },
      ],
    }),
  }

  const Command2 = await t.mockImport<
    typeof import('../../src/commands/pkg.ts')
  >('../../src/commands/pkg.ts', {
    '@vltpkg/graph': {
      actual: { load: () => mockGraph },
      GraphModifier: { maybeLoad: () => undefined },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors() {
          return false
        }
        search = mockQuery2.search
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: { start: async () => undefined },
    },
  })

  await t.rejects(
    Command2.command(
      Object.assign({}, config, {
        positionals: ['get', null as any],
      }) as LoadedConfig,
    ),
    {
      cause: { code: 'EUSAGE' },
    },
    'should reject with null key in multiple manifests get',
  )

  const getMultipleResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['get', 'version'],
    }) as LoadedConfig,
  )

  t.strictSame(
    getMultipleResult,
    ['2.0.0', '3.0.0'],
    'should get values from multiple manifests',
  )

  const pickMultipleWithArgsResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['pick', 'name'],
    }) as LoadedConfig,
  )

  t.strictSame(
    pickMultipleWithArgsResult,
    [{ name: 'workspace-a' }, { name: 'workspace-b' }],
    'should pick values from multiple manifests with args',
  )

  const rmMultipleResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['rm', 'customField'],
    }) as LoadedConfig,
  )

  t.strictSame(
    Array.isArray(rmMultipleResult),
    true,
    'should return results array for multiple manifests rm',
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['set', 'customField=scopedValue'],
    }) as LoadedConfig,
  )

  t.strictSame(
    JSON.parse(readPackageJson(join(dir, 'packages', 'a')))
      .customField,
    'scopedValue',
    'should set value in workspace a via scope',
  )
  t.strictSame(
    JSON.parse(readPackageJson(join(dir, 'packages', 'b')))
      .customField,
    'scopedValue',
    'should set value in workspace b via scope',
  )

  const rmResult = await Command.command(
    Object.assign({}, config, {
      positionals: ['rm', 'description'],
    }) as LoadedConfig,
  )

  t.strictSame(
    Array.isArray(rmResult),
    true,
    'should return array for multiple manifests rm',
  )

  t.notOk(
    JSON.parse(readPackageJson(join(dir, 'packages', 'a')))
      .description,
    'should remove description from workspace a via scope',
  )
  t.notOk(
    JSON.parse(readPackageJson(join(dir, 'packages', 'b')))
      .description,
    'should remove description from workspace b via scope',
  )
})

t.test('scope with no matching workspaces', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }),
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./packages/*'] },
    }),
  })
  t.chdir(dir)

  const mockQuery = {
    search: async () => ({ nodes: [] }),
  }

  const Command = await t.mockImport<
    typeof import('../../src/commands/pkg.ts')
  >('../../src/commands/pkg.ts', {
    '@vltpkg/graph': {
      actual: {
        load: () => ({ nodes: new Map() }),
      },
      GraphModifier: {
        maybeLoad: () => undefined,
      },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors() {
          return false
        }
        search = mockQuery.search
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => undefined,
      },
    },
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: {
      packageJson: new PackageJson(),
      projectRoot: dir,
    },
    values: {
      scope: ':nonexistent',
    },
  })

  await t.rejects(
    Command.command(
      Object.assign({}, config, {
        positionals: ['get', 'name'],
      }) as LoadedConfig,
    ),
    /No matching package found using scope/,
    'should reject when no workspaces match scope',
  )
})

t.test('scope with security selectors', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }),
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

  const mockSecurityArchive = { ok: true }
  const mockQuery = {
    search: async () => ({
      nodes: [
        {
          id: 'workspace-a-id',
          location: 'packages/a',
          name: 'workspace-a',
          toJSON: () => ({
            location: 'packages/a',
          }),
        },
      ],
    }),
  }

  const Command = await t.mockImport<
    typeof import('../../src/commands/pkg.ts')
  >('../../src/commands/pkg.ts', {
    '@vltpkg/graph': {
      actual: {
        load: () => ({ nodes: new Map() }),
      },
      GraphModifier: {
        maybeLoad: () => undefined,
      },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors(query: string) {
          return query.includes(':malware')
        }
        search = mockQuery.search
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => mockSecurityArchive,
      },
    },
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: {
      packageJson: new PackageJson(),
      projectRoot: dir,
    },
    values: {
      scope: '*:malware',
    },
  })

  const result = await Command.command(
    Object.assign({}, config, {
      positionals: ['get', 'name'],
    }) as LoadedConfig,
  )

  t.strictSame(
    result,
    ['workspace-a'],
    'should handle scope with security selectors',
  )
})

t.test('alternative command aliases', async t => {
  const pkg = {
    name: 'test-package',
    version: '1.0.0',
    toRemove: 'should be removed',
  }

  const dir = t.testdir({
    'package.json': JSON.stringify(pkg),
  })

  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  })
  t.chdir(dir)

  await Command.command(
    Object.assign({}, config, {
      positionals: ['remove', 'toRemove'],
    }) as LoadedConfig,
  )

  t.notOk(
    JSON.parse(readPackageJson(dir)).toRemove,
    'should handle "remove" alias',
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['set', 'toRemove=should be removed'],
    }) as LoadedConfig,
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['unset', 'toRemove'],
    }) as LoadedConfig,
  )

  t.notOk(
    JSON.parse(readPackageJson(dir)).toRemove,
    'should handle "unset" alias',
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['set', 'toRemove=should be removed'],
    }) as LoadedConfig,
  )

  await Command.command(
    Object.assign({}, config, {
      positionals: ['delete', 'toRemove'],
    }) as LoadedConfig,
  )

  t.notOk(
    JSON.parse(readPackageJson(dir)).toRemove,
    'should handle "delete" alias',
  )
})

t.test('human output', async t => {
  const human = (
    res: unknown,
    { positionals }: { positionals: string[] },
  ) =>
    Command.views.human(
      res,
      {} as ViewOptions,
      {
        positionals,
      } as LoadedConfig,
    )

  t.test('init', async t => {
    t.matchSnapshot(
      human(
        {
          manifest: {
            path: '/some/path',
            data: { name: 'myproject' },
          },
        },
        { positionals: ['init'] },
      ),
    )
    t.strictSame(human({}, { positionals: ['not', 'init'] }), '{}')
  })

  t.test('get', async t => {
    t.strictSame(
      human(
        { [Symbol.for('some symbol')]: 1, a: 2 },
        { positionals: ['get'] },
      ),
      JSON.stringify({ a: 2 }, null, 2),
    )
    t.strictSame(human(1, { positionals: ['get'] }), '1')
  })

  t.test('json output for arrays', async t => {
    const arrayResult = [
      { manifest: { name: 'pkg1' }, location: '/path1' },
      { manifest: { name: 'pkg2' }, location: '/path2' },
    ]
    t.strictSame(
      human(arrayResult, { positionals: ['get'] }),
      JSON.stringify(arrayResult, null, 2),
      'should handle array results',
    )

    const stringArray = ['result1', 'result2']
    t.strictSame(
      human(stringArray, { positionals: ['get'] }),
      'result1\nresult2',
      'should handle string array results',
    )
  })
})

t.test('scope option', async t => {
  await t.test('scope config is properly read', async t => {
    const config = makeTestConfig({
      projectRoot: '/test/dir',
      options: { packageJson: new PackageJson() },
      positionals: ['get', 'name'],
      values: { scope: ':workspace#workspace-a' },
      get: (key: string) =>
        key === 'scope' ? ':workspace#workspace-a' : undefined,
    })

    t.equal(
      config.get('scope'),
      ':workspace#workspace-a',
      'should read scope from config',
    )
    t.equal(
      (config.get as any)('unknown'),
      undefined,
      'should return undefined for unknown keys',
    )
  })

  await t.test('scope config handles undefined values', async t => {
    const config = makeTestConfig({
      projectRoot: '/test/dir',
      options: { packageJson: new PackageJson() },
      positionals: ['get', 'name'],
    })

    t.equal(
      config.get('scope'),
      undefined,
      'should return undefined when no values',
    )
  })
})

t.test(
  'workspace options without scope - workspace array',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['./packages/*'] },
      }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '2.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '3.0.0',
          }),
        },
      },
    })
    t.chdir(dir)

    const Command = await t.mockImport<
      typeof import('../../src/commands/pkg.ts')
    >('../../src/commands/pkg.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({ nodes: new Map() }),
        },
        GraphModifier: {
          maybeLoad: () => undefined,
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => ({}),
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        monorepo: [
          {
            name: '@test/a',
            fullpath: join(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: join(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['get', 'name'],
      values: { workspace: ['packages/a', 'packages/b'] },
    })

    const result = await Command.command(config)
    t.strictSame(
      result,
      ['@test/a', '@test/b'],
      'should handle workspace array without scope query',
    )
  },
)

t.test(
  'workspace options without scope - workspace-group array',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['./packages/*'] },
      }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '2.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '3.0.0',
          }),
        },
      },
    })
    t.chdir(dir)

    const Command = await t.mockImport<
      typeof import('../../src/commands/pkg.ts')
    >('../../src/commands/pkg.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({ nodes: new Map() }),
        },
        GraphModifier: {
          maybeLoad: () => undefined,
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => ({}),
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        monorepo: [
          {
            name: '@test/a',
            fullpath: join(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: join(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['get', 'name'],
      values: { 'workspace-group': ['packages'] },
    })

    const result = await Command.command(config)
    t.strictSame(
      result,
      ['@test/a', '@test/b'],
      'should handle workspace-group array without scope query',
    )
  },
)

t.test(
  'workspace options without scope - recursive flag',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['./packages/*'] },
      }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '2.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '3.0.0',
          }),
        },
      },
    })
    t.chdir(dir)

    const Command = await t.mockImport<
      typeof import('../../src/commands/pkg.ts')
    >('../../src/commands/pkg.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({ nodes: new Map() }),
        },
        GraphModifier: {
          maybeLoad: () => undefined,
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => ({}),
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        monorepo: [
          {
            name: '@test/a',
            fullpath: join(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: join(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['get', 'name'],
      values: { recursive: true },
    })

    const result = await Command.command(config)
    t.strictSame(
      result,
      ['@test/a', '@test/b'],
      'should handle recursive flag without scope query',
    )
  },
)

t.test(
  'workspace options without scope - undefined monorepo',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
    })
    t.chdir(dir)

    const Command = await t.mockImport<
      typeof import('../../src/commands/pkg.ts')
    >('../../src/commands/pkg.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({ nodes: new Map() }),
        },
        GraphModifier: {
          maybeLoad: () => undefined,
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => ({}),
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        monorepo: undefined,
      },
      positionals: ['get', 'name'],
      values: { recursive: true },
    })

    await t.rejects(
      Command.command(config),
      /No matching package found using scope/,
      'should reject when recursive is used with undefined monorepo',
    )
  },
)

t.test(
  'workspace options without scope - empty monorepo',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
    })
    t.chdir(dir)

    const Command = await t.mockImport<
      typeof import('../../src/commands/pkg.ts')
    >('../../src/commands/pkg.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({ nodes: new Map() }),
        },
        GraphModifier: {
          maybeLoad: () => undefined,
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => ({}),
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        monorepo: [],
      },
      positionals: ['get', 'name'],
      values: { recursive: true },
    })

    await t.rejects(
      Command.command(config),
      /No matching package found using scope/,
      'should reject when recursive is used with empty monorepo',
    )
  },
)

t.test('get with no arguments', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
  })
  t.chdir(dir)
  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
    positionals: ['get'],
  })

  config.options.packageJson.find = () => dir
  config.options.packageJson.read = () => ({
    name: 'test',
    version: '1.0.0',
  })

  const result = await Command.command(config)
  t.strictSame(
    result,
    { name: 'test', version: '1.0.0' },
    'should return full manifest when no key specified',
  )
})

t.test('single package mode - fallback to projectRoot', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }),
  })
  t.chdir(dir)
  const config = makeTestConfig({
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
    positionals: ['get', 'name'],
  })

  config.options.packageJson.find = () => undefined
  config.options.packageJson.read = () => ({
    name: 'test-project',
    version: '1.0.0',
  })

  const result = await Command.command(config)
  t.strictSame(
    result,
    'test-project',
    'should fallback to projectRoot when PackageJson.find returns undefined',
  )
})

t.test(
  'single package mode - PackageJson.find returns current directory',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
      }),
    })
    t.chdir(dir)
    const config = makeTestConfig({
      projectRoot: dir,
      options: { packageJson: new PackageJson() },
      positionals: ['get', 'name'],
    })

    config.options.packageJson.find = () => dir
    config.options.packageJson.read = () => ({
      name: 'test-project',
      version: '1.0.0',
    })

    const result = await Command.command(config)
    t.strictSame(
      result,
      'test-project',
      'should use PackageJson.find result when it returns a valid path',
    )
  },
)
