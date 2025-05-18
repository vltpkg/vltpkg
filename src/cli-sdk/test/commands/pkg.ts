import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PackageJson } from '@vltpkg/package-json'
import t from 'tap'
import * as Command from '../../src/commands/pkg.ts'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ViewOptions } from '../../src/view.ts'
import { setupEnv } from '../fixtures/util.ts'
import { kNewline, kIndent } from 'polite-json'

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
