import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const mockCommand = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../../src/commands/version.ts')>(
    '../../src/commands/version.ts',
    mocks,
  )

// Mock git operations
let gitIsResult = false
let gitIsCleanResult = true
let gitSpawnCalls: { args: string[] }[] = []

const mockGit = {
  is: async () => gitIsResult,
  isClean: async () => gitIsCleanResult,
  spawn: async (args: string[]) => {
    gitSpawnCalls.push({ args })

    // Handle git diff --name-only HEAD for checking uncommitted changes
    if (
      args[0] === 'diff' &&
      args[1] === '--name-only' &&
      args[2] === 'HEAD'
    ) {
      return { stdout: 'package.json\n' }
    }

    // Default success response
    return { stdout: '', stderr: '', status: 0 }
  },
}

class MockConfig {
  values: Record<string, any>
  positionals: string[]
  packageJsonContent: Record<string, any>
  writtenManifests: { cwd: string; data: any }[] = []

  constructor(
    positionals: string[],
    values: Record<string, any>,
    packageJsonContent: Record<string, any> = { version: '1.0.0' },
  ) {
    this.positionals = positionals
    this.values = values
    this.packageJsonContent = packageJsonContent
    this.values.packageJson = {
      find: (_cwd: string) => ({ ...this.packageJsonContent }),
      write: (cwd: string, data: any) => {
        this.writtenManifests.push({ cwd, data })
      },
    }
    this.values.scurry = new PathScurry(t.testdirName)
  }

  get options() {
    return this.values
  }
}

const run = async (
  t: Test,
  positionals: string[],
  values: Record<string, any> = {},
  packageJsonContent?: Record<string, any>,
  gitMocks?: Partial<typeof mockGit>,
) => {
  // Reset git state
  gitIsResult = false
  gitIsCleanResult = true
  gitSpawnCalls = []

  const conf = new MockConfig(positionals, values, packageJsonContent)
  const cmd = await mockCommand(t, {
    '@vltpkg/git': { ...mockGit, ...gitMocks },
  })

  return {
    result: await cmd.command(conf as unknown as LoadedConfig),
    conf,
    gitSpawnCalls,
  }
}

t.test('usage', async t => {
  const cmd = await mockCommand(t)
  const usage = cmd.usage().usage()
  t.matchSnapshot(usage, 'usage')
})

t.test('views', async t => {
  const cmd = await mockCommand(t)

  t.test('json view', async t => {
    const result = {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: '/test',
    }
    t.strictSame(cmd.views.json(result), result)
  })

  t.test('human view - basic', async t => {
    const result = {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: '/test',
    }
    t.equal(cmd.views.human(result), 'v1.0.1')
  })

  t.test('human view - with commit', async t => {
    const result = {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: '/test',
      committed: ['package.json'],
    }
    t.equal(cmd.views.human(result), 'v1.0.1 +commit')
  })

  t.test('human view - with tag', async t => {
    const result = {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: '/test',
      tag: 'v1.0.1',
    }
    t.equal(cmd.views.human(result), 'v1.0.1 +tag')
  })

  t.test('human view - with commit and tag', async t => {
    const result = {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: '/test',
      committed: ['package.json'],
      tag: 'v1.0.1',
    }
    t.equal(cmd.views.human(result), 'v1.0.1 +commit +tag')
  })
})

t.test('version command - no increment provided', async t => {
  await t.rejects(run(t, []), {
    message: 'Version increment argument is required',
    cause: {
      code: 'EUSAGE',
      validOptions: [
        'major',
        'minor',
        'patch',
        'pre',
        'premajor',
        'preminor',
        'prepatch',
        'prerelease',
      ],
    },
  })
})

t.test('version command - no version in package.json', async t => {
  await t.rejects(run(t, ['patch'], {}, {}), {
    message: 'No version field found in package.json',
    cause: {
      path: process.cwd(),
    },
  })
})

t.test('version command - patch increment', async t => {
  const { result, conf } = await run(t, ['patch'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '1.0.1',
    dir: process.cwd(),
  })

  t.equal(conf.writtenManifests.length, 1)
  t.equal(conf.writtenManifests[0]?.data.version, '1.0.1')
})

t.test('version command - minor increment', async t => {
  const { result } = await run(t, ['minor'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '1.1.0',
    dir: process.cwd(),
  })
})

t.test('version command - major increment', async t => {
  const { result } = await run(t, ['major'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '2.0.0',
    dir: process.cwd(),
  })
})

t.test('version command - premajor increment', async t => {
  const { result } = await run(t, ['premajor'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '2.0.0-pre',
    dir: process.cwd(),
  })
})

t.test('version command - preminor increment', async t => {
  const { result } = await run(t, ['preminor'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '1.1.0-pre',
    dir: process.cwd(),
  })
})

t.test('version command - prepatch increment', async t => {
  const { result } = await run(t, ['prepatch'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '1.0.1-pre',
    dir: process.cwd(),
  })
})

t.test('version command - prerelease increment', async t => {
  const { result } = await run(
    t,
    ['prerelease'],
    {},
    { version: '1.0.0-pre' },
  )

  t.strictSame(result, {
    oldVersion: '1.0.0-pre',
    newVersion: '1.0.0-pre.0',
    dir: process.cwd(),
  })
})

t.test('version command - explicit semver version', async t => {
  const { result } = await run(t, ['2.3.4'])

  t.strictSame(result, {
    oldVersion: '1.0.0',
    newVersion: '2.3.4',
    dir: process.cwd(),
  })
})

t.test(
  'version command - explicit semver version with prerelease',
  async t => {
    const { result } = await run(t, ['2.3.4-beta.1'])

    t.strictSame(result, {
      oldVersion: '1.0.0',
      newVersion: '2.3.4-beta.1',
      dir: process.cwd(),
    })
  },
)

t.test('version command - invalid increment type', async t => {
  await t.rejects(run(t, ['invalid']), {
    message:
      'Invalid version increment: invalid. Must be a valid semver version or one of: major, minor, patch, premajor, preminor, prepatch, prerelease',
    cause: {
      found: 'invalid',
      validOptions: [
        'major',
        'minor',
        'patch',
        'pre',
        'premajor',
        'preminor',
        'prepatch',
        'prerelease',
      ],
    },
  })
})

t.test('version command - semver increment failure', async t => {
  // Import the real semver module and create a mock that extends it
  const semverModule = await import('@vltpkg/semver')

  const cmd = await mockCommand(t, {
    '@vltpkg/semver': {
      ...semverModule,
      inc: () => {
        throw new Error('Invalid version')
      },
    },
  })

  const conf = new MockConfig(['patch'], {})

  await t.rejects(cmd.command(conf as unknown as LoadedConfig), {
    message: 'Failed to increment version from 1.0.0 with patch',
    cause: {
      version: '1.0.0',
      wanted: 'patch',
      cause: { message: 'Invalid version' },
    },
  })
})

t.test('git operations', async t => {
  t.test('in git repo - clean working directory', async t => {
    const { result, gitSpawnCalls } = await run(
      t,
      ['patch'],
      {},
      undefined,
      {
        is: async () => true,
        isClean: async () => true,
      },
    )

    t.strictSame(result, {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: process.cwd(),
      committed: ['package.json'],
      tag: 'v1.0.1',
    })

    // Should have made git add, commit, and tag calls
    t.equal(gitSpawnCalls.length, 3)
    t.strictSame(gitSpawnCalls[0]?.args, ['add', 'package.json'])
    t.strictSame(gitSpawnCalls[1]?.args, ['commit', '-m', 'v1.0.1'])
    t.strictSame(gitSpawnCalls[2]?.args, [
      'tag',
      'v1.0.1',
      '-m',
      'v1.0.1',
    ])
  })

  t.test(
    'in git repo - dirty working directory with only package.json changes',
    async t => {
      const { result } = await run(t, ['patch'], {}, undefined, {
        is: async () => true,
        isClean: async () => false,
        spawn: async (args: string[]) => {
          gitSpawnCalls.push({ args })
          if (
            args[0] === 'diff' &&
            args[1] === '--name-only' &&
            args[2] === 'HEAD'
          ) {
            return { stdout: 'package.json\n' }
          }
          return { stdout: '', stderr: '', status: 0 }
        },
      })

      t.strictSame(result, {
        oldVersion: '1.0.0',
        newVersion: '1.0.1',
        dir: process.cwd(),
        committed: ['package.json'],
        tag: 'v1.0.1',
      })
    },
  )

  t.test(
    'in git repo - dirty working directory with other changes',
    async t => {
      await t.rejects(
        run(t, ['patch'], {}, undefined, {
          is: async () => true,
          isClean: async () => false,
          spawn: async (args: string[]) => {
            if (
              args[0] === 'diff' &&
              args[1] === '--name-only' &&
              args[2] === 'HEAD'
            ) {
              return { stdout: 'package.json\nother-file.js\n' }
            }
            return { stdout: '', stderr: '', status: 0 }
          },
        }),
        {
          message:
            'Git working directory not clean. Please commit or stash your changes first.',
          cause: {
            cause: {
              found: ['other-file.js'],
            },
          },
        },
      )
    },
  )

  t.test('in git repo - git diff command fails', async t => {
    await t.rejects(
      run(t, ['patch'], {}, undefined, {
        is: async () => true,
        isClean: async () => false,
        spawn: async (args: string[]) => {
          if (args[0] === 'diff') {
            throw new Error('Git diff failed')
          }
          return { stdout: '', stderr: '', status: 0 }
        },
      }),
      {
        message:
          'Git working directory not clean. Please commit or stash your changes first.',
        cause: {
          message: 'Git diff failed',
        },
      },
    )
  })

  t.test('in git repo - commit fails', async t => {
    await t.rejects(
      run(t, ['patch'], {}, undefined, {
        is: async () => true,
        isClean: async () => true,
        spawn: async (args: string[]) => {
          if (args[0] === 'commit') {
            throw new Error('Commit failed')
          }
          return { stdout: '', stderr: '', status: 0 }
        },
      }),
      {
        message: 'Failed to commit version changes',
        cause: {
          version: '1.0.1',
          cause: { message: 'Commit failed' },
        },
      },
    )
  })

  t.test('in git repo - tag fails', async t => {
    await t.rejects(
      run(t, ['patch'], {}, undefined, {
        is: async () => true,
        isClean: async () => true,
        spawn: async (args: string[]) => {
          if (args[0] === 'tag') {
            throw new Error('Tag failed')
          }
          return { stdout: '', stderr: '', status: 0 }
        },
      }),
      {
        message: 'Failed to create git tag',
        cause: {
          version: '1.0.1',
          cause: { message: 'Tag failed' },
        },
      },
    )
  })

  t.test('not in git repo', async t => {
    const { result, gitSpawnCalls } = await run(
      t,
      ['patch'],
      {},
      undefined,
      {
        is: async () => false,
      },
    )

    t.strictSame(result, {
      oldVersion: '1.0.0',
      newVersion: '1.0.1',
      dir: process.cwd(),
    })

    // Should not have made any git calls
    t.equal(gitSpawnCalls.length, 0)
  })
})
