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

setupEnv(t)

t.matchSnapshot(Command.usage().usage(), 'usage')

t.test('basic', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: [] }),
    'package.json': JSON.stringify({}),
  })
  const config = {
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
    positionals: ['gett'],
  } as LoadedConfig
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

  const config = {
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  }
  t.chdir(dir)

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['get'],
    } as LoadedConfig),
    { ...pkg, [kNewline]: '', [kIndent]: '' },
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['get', 'name'],
    } as LoadedConfig),
    'package-name',
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['get', 'nested.keywords[3].obj[1]'],
    } as LoadedConfig),
    'arrays',
  )

  await t.rejects(
    Command.command({
      ...config,
      positionals: ['get', 'name', 'version'],
    } as LoadedConfig),
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

  const config = {
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  }
  t.chdir(dir)

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['pick'],
    } as LoadedConfig),
    { ...pkg, [kNewline]: '', [kIndent]: '' },
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['pick', 'name'],
    } as LoadedConfig),
    { name: 'package-name' },
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['pick', 'nested.keywords[3].obj[1]'],
    } as LoadedConfig),
    {
      nested: {
        keywords: [null, null, null, { obj: [null, 'arrays'] }],
      },
    },
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['pick', 'nested.keywords'],
    } as LoadedConfig),
    {
      nested: {
        keywords: ['one', 'two', 'last', { obj: ['more', 'arrays'] }],
      },
    },
  )

  t.strictSame(
    await Command.command({
      ...config,
      positionals: ['pick', 'name', 'version'],
    } as LoadedConfig),
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
      await Command.command({
        ...config,
        positionals: ['get', 'name'],
      } as LoadedConfig),
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
      const config = {
        projectRoot: dir,
        options: { packageJson: new PackageJson() },
        positionals: ['get'],
      } as LoadedConfig

      // mocks the find method to simulate an environment in which
      // no package.json was found but we still have a projectRoot
      config.options.packageJson.find = () => undefined

      t.strictSame(
        await Command.command({
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          ...config,
          positionals: ['get', 'name'],
        } as LoadedConfig),
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

  const config = {
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  }
  t.chdir(dir)

  await Command.command({
    ...config,
    positionals: ['set', 'name=new-package-name'],
  } as LoadedConfig)
  t.strictSame(JSON.parse(readPackageJson(dir)), {
    name: 'new-package-name',
    version: '1.0.0',
    description: 'This is the desc',
  })

  await t.rejects(
    Command.command({
      ...config,
      positionals: ['set'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )

  await t.rejects(
    Command.command({
      ...config,
      positionals: ['set', 'name'],
    } as LoadedConfig),
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

    await Command.command({
      ...config,
      positionals: ['set', 'foo=bar'],
    } as LoadedConfig)

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

  const config = {
    projectRoot: dir,
    options: { packageJson: new PackageJson() },
  }
  t.chdir(dir)

  await Command.command({
    ...config,
    positionals: ['rm', 'name'],
  } as LoadedConfig)

  await Command.command({
    ...config,
    positionals: ['rm', 'nested.keywords[3].obj[0]'],
  } as LoadedConfig)

  t.strictSame(JSON.parse(readPackageJson(dir)), {
    version: '1.0.0',
    description: 'This is the desc',
    nested: {
      keywords: ['one', 'two', 'last', { obj: ['arrays'] }],
    },
  })

  await t.rejects(
    Command.command({
      ...config,
      positionals: ['rm'],
    } as LoadedConfig),
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

    await Command.command({
      ...config,
      positionals: ['rm', 'foo'],
    } as LoadedConfig)

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
    t.strictSame(human({}, { positionals: ['not', 'init'] }), {})
  })

  t.test('get', async t => {
    t.strictSame(
      human(
        { [Symbol.for('some symbol')]: 1, a: 2 },
        { positionals: ['get'] },
      ),
      { a: 2 },
    )
    t.strictSame(human(1, { positionals: ['get'] }), 1)
  })
})
