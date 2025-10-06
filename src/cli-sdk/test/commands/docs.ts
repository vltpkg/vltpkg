import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Manifest } from '@vltpkg/types'

let openedUrl: string | undefined
let mockManifest: Manifest | undefined
let mockFromUrlResult: { docs: () => string } | null = null

const Command = await t.mockImport<
  typeof import('../../src/commands/docs.ts')
>('../../src/commands/docs.ts', {
  '@vltpkg/url-open': {
    urlOpen: async (url: string) => {
      openedUrl = url
    },
  },
  '@vltpkg/package-info': {
    PackageInfoClient: class {
      async manifest() {
        if (!mockManifest) {
          throw new Error('No manifest found')
        }
        return mockManifest
      }
    },
  },
  'hosted-git-info': {
    fromUrl: (url: string) => {
      t.ok(url, 'fromUrl called with url')
      return mockFromUrlResult
    },
  },
})

t.beforeEach(() => {
  openedUrl = undefined
  mockManifest = undefined
  mockFromUrlResult = null
})

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usageMarkdown())
})

t.test('views', async t => {
  t.strictSame(
    Command.views.json({ url: 'https://example.com', name: 'pkg' }),
    { url: 'https://example.com', name: 'pkg' },
  )
  t.strictSame(
    Command.views.human({
      url: 'https://example.com',
      name: 'pkg',
    }),
    'https://example.com',
  )
})

t.test('no args - reads from local package.json', async t => {
  const localManifest = {
    name: 'my-package',
    repository: {
      type: 'git',
      url: 'https://github.com/user/repo',
    },
  }

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const config = {
    positionals: [],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: (path: string) => {
          t.equal(path, '/test/project')
          return localManifest
        },
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'my-package',
    url: 'https://github.com/user/repo#readme',
  })
  t.equal(openedUrl, 'https://github.com/user/repo#readme')
})

t.test('with spec arg - fetches manifest', async t => {
  mockManifest = {
    name: 'abbrev',
    version: '2.0.0',
    repository: {
      type: 'git',
      url: 'https://github.com/npm/abbrev',
    },
  } as Manifest

  mockFromUrlResult = {
    docs: () => 'https://github.com/npm/abbrev#readme',
  }

  const config = {
    positionals: ['abbrev@2.0.0'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'abbrev',
    url: 'https://github.com/npm/abbrev#readme',
  })
  t.equal(openedUrl, 'https://github.com/npm/abbrev#readme')
})

t.test('repository as string', async t => {
  mockManifest = {
    name: 'test-pkg',
    repository: 'https://github.com/user/repo',
  } as Manifest

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const config = {
    positionals: ['test-pkg'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'test-pkg',
    url: 'https://github.com/user/repo#readme',
  })
})

t.test('git+ prefix stripped from repository url', async t => {
  mockManifest = {
    name: 'test-pkg',
    repository: {
      type: 'git',
      url: 'git+https://github.com/user/repo',
    },
  } as Manifest

  const fromUrlCalls: string[] = []
  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const CommandWithTracking = await t.mockImport<
    typeof import('../../src/commands/docs.ts')
  >('../../src/commands/docs.ts', {
    '@vltpkg/url-open': {
      urlOpen: async (url: string) => {
        openedUrl = url
      },
    },
    '@vltpkg/package-info': {
      PackageInfoClient: class {
        async manifest() {
          return mockManifest
        }
      },
    },
    'hosted-git-info': {
      fromUrl: (url: string) => {
        fromUrlCalls.push(url)
        return mockFromUrlResult
      },
    },
  })

  const config = {
    positionals: ['test-pkg'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await CommandWithTracking.command(config)

  t.strictSame(fromUrlCalls, ['https://github.com/user/repo'])
})

t.test('fallback to npmjs.com when no repository', async t => {
  mockManifest = {
    name: 'no-repo-pkg',
  } as Manifest

  const config = {
    positionals: ['no-repo-pkg'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'no-repo-pkg',
    url: 'https://www.npmjs.com/package/no-repo-pkg',
  })
  t.equal(openedUrl, 'https://www.npmjs.com/package/no-repo-pkg')
})

t.test(
  'fallback to npmjs.com when hosted-git-info fails',
  async t => {
    mockManifest = {
      name: 'unknown-host-pkg',
      repository: 'https://unknown-git-host.com/user/repo',
    } as Manifest

    mockFromUrlResult = null

    const config = {
      positionals: ['unknown-host-pkg'],
      options: {
        projectRoot: '/test/project',
        packageJson: {
          read: () => ({}),
        },
      },
    } as unknown as LoadedConfig

    const result = await Command.command(config)

    t.strictSame(result, {
      name: 'unknown-host-pkg',
      url: 'https://www.npmjs.com/package/unknown-host-pkg',
    })
  },
)

t.test('error when no manifest found', async t => {
  mockManifest = undefined

  const config = {
    positionals: ['nonexistent'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await t.rejects(Command.command(config), {
    message: 'No manifest found',
  })
})

t.test('error when manifest has no name', async t => {
  mockManifest = {} as Manifest

  const config = {
    positionals: ['invalid'],
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await t.rejects(Command.command(config), {
    message: 'No package name found',
  })
})
