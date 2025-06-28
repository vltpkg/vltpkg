import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { InitFileResults } from '@vltpkg/init'

const inited: string[] = []
const vltJsonData: Record<string, any> = {}

const { usage, command, views } = await t.mockImport<
  typeof import('../../src/commands/init.ts')
>('../../src/commands/init.ts', {
  '@vltpkg/init': {
    init: async ({ cwd }: { cwd: string }) => {
      inited.push(cwd)
    },
    getAuthorFromGitUser() {
      return ''
    },
  },
  '@vltpkg/vlt-json': {
    load: (field: string) => vltJsonData[field],
    save: (field: string, value: any) => {
      vltJsonData[field] = value
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())

t.test('test command', async t => {
  t.chdir(t.testdir())
  await command({ values: {} } as LoadedConfig)
  t.strictSame(inited, [t.testdirName])
})

t.test('test command with workspace', async t => {
  const res: InitFileResults[] = []
  const { command, views } = await t.mockImport<
    typeof import('../../src/commands/init.ts')
  >('../../src/commands/init.ts', {
    '@vltpkg/init': {
      init: async ({ cwd }: { cwd: string }) => {
        res.push({
          manifest: {
            path: cwd,
            data: {
              name: 'a',
              version: '1.0.0',
            },
          },
        })
      },
      getAuthorFromGitUser() {
        return ''
      },
    },
  })
  const dir = t.testdir({
    'README.md': 'This is a workspace',
    '.git': {},
  })
  t.chdir(dir)
  inited.length = 0 // reset array

  await command({
    values: {
      workspace: ['packages/a'],
    },
    options: {
      projectRoot: dir,
    },
  } as unknown as LoadedConfig)
  t.strictSame(
    res,
    [
      {
        manifest: {
          data: { name: 'a', version: '1.0.0' },
          path: resolve(dir, 'packages/a'),
        },
      },
    ],
    'should have initial result',
  )
  t.matchSnapshot(
    readFileSync(resolve(dir, 'vlt.json'), 'utf8'),
    'should add workspace to vlt.json',
  )

  t.matchSnapshot(
    views
      .human(res)
      .replace(resolve(dir, 'packages/a'), 'packages/a'),
    'should output human readable message',
  )
})

t.test('test command with empty workspace array', async t => {
  t.chdir(t.testdir())
  inited.length = 0 // reset array
  await command({
    values: {
      workspace: [],
    },
  } as unknown as LoadedConfig)
  t.strictSame(inited, [t.testdirName])
})

t.test('test command with undefined workspace', async t => {
  t.chdir(t.testdir())
  inited.length = 0 // reset array
  await command({
    values: {
      workspace: undefined,
    },
  } as unknown as LoadedConfig)
  t.strictSame(inited, [t.testdirName])
})

t.test(
  'test workspace already matched by existing pattern',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = 'packages/*'
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['packages/a'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'packages/a')])

    // vlt.json should remain unchanged since packages/a matches packages/*
    t.strictSame(vltJsonData.workspaces, 'packages/*')
  },
)

t.test(
  'test string workspace config - add non-matching workspace',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = 'packages/*'
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['docs/website'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'docs/website')])

    // vlt.json should be converted to array with new workspace added
    t.strictSame(vltJsonData.workspaces, [
      'packages/*',
      'docs/website',
    ])
  },
)

t.test(
  'test array workspace config - add non-matching workspace',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = ['app/*', 'docs/*']
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['packages/a'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'packages/a')])

    // new workspace should be appended to existing array
    t.strictSame(vltJsonData.workspaces, [
      'app/*',
      'docs/*',
      'packages/a',
    ])
  },
)

t.test(
  'test object with packages key (array) - add non-matching workspace',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = {
      packages: ['packages/*'],
    }
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['docs/website'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'docs/website')])

    // new workspace should be appended to packages array
    t.strictSame(vltJsonData.workspaces, {
      packages: ['packages/*', 'docs/website'],
    })
  },
)

t.test(
  'test object with packages key (string) - convert to array and add workspace',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = {
      packages: 'packages/a',
    }
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['packages/b'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'packages/b')])

    // packages should be converted to array with new workspace added
    t.strictSame(vltJsonData.workspaces, {
      packages: ['packages/a', 'packages/b'],
    })
  },
)

t.test(
  'test object without packages key - create packages key with new workspace',
  async t => {
    const dir = t.testdir({
      'README.md': 'This is a workspace',
      '.git': {},
    })

    // Set up initial vlt.json data in mock
    vltJsonData.workspaces = {
      utils: ['utils/*'],
    }
    inited.length = 0 // reset array

    await command({
      values: {
        workspace: ['docs/website'],
      },
      options: {
        projectRoot: dir,
      },
    } as unknown as LoadedConfig)

    t.strictSame(inited, [resolve(dir, 'docs/website')])

    // packages key should be created with new workspace
    t.strictSame(vltJsonData.workspaces, {
      utils: ['utils/*'],
      packages: ['docs/website'],
    })
  },
)

t.test('test multiple workspaces with mixed matching', async t => {
  const dir = t.testdir({
    'README.md': 'This is a workspace',
    '.git': {},
  })

  // Set up initial vlt.json data in mock
  vltJsonData.workspaces = ['packages/*', 'apps/*']
  inited.length = 0 // reset array

  await command({
    values: {
      workspace: ['packages/a', 'docs/website', 'apps/web'],
    },
    options: {
      projectRoot: dir,
    },
  } as unknown as LoadedConfig)

  t.strictSame(inited, [
    resolve(dir, 'packages/a'),
    resolve(dir, 'docs/website'),
    resolve(dir, 'apps/web'),
  ])

  // only docs/website should be added since packages/a and apps/web match existing patterns
  t.strictSame(vltJsonData.workspaces, [
    'packages/*',
    'apps/*',
    'docs/website',
  ])
})

t.test('human output', t => {
  t.matchSnapshot(
    views.human({
      manifest: {
        path: '/some/path',
        data: { name: 'myproject' },
      },
    }),
  )
  t.end()
})
