import { PathScurry } from 'path-scurry'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { CommandResultSingle } from '../../src/commands/version.ts'
import * as actualGitModule from '@vltpkg/git'

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
  ...actualGitModule, // Include all real exports from the git module
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
  projectRoot: string

  constructor(
    positionals: string[],
    values: Record<string, any>,
    packageJsonContent: Record<string, any> = { version: '1.0.0' },
  ) {
    this.positionals = positionals
    this.values = values
    this.packageJsonContent = packageJsonContent
    this.projectRoot = process.cwd()
    this.values.packageJson = {
      read: (_cwd: string) => ({ ...this.packageJsonContent }),
      find: (cwd: string) => {
        // If cwd is already a package.json path, check if it should exist
        if (cwd.endsWith('/package.json')) {
          const dir = cwd.replace('/package.json', '')
          if (dir === process.cwd() || dir === this.projectRoot) {
            return cwd
          }
          // Otherwise return null
          return null
        }
        // If cwd is a directory that should have a package.json
        if (cwd === process.cwd() || cwd === this.projectRoot) {
          return cwd + '/package.json'
        }
        // Otherwise return null to simulate no package.json found
        return null
      },
      write: (cwd: string, data: any) => {
        this.writtenManifests.push({ cwd, data })
      },
    }
    this.values.scurry = new PathScurry(t.testdirName)
    this.values.projectRoot = this.projectRoot
    this.values.monorepo = values.monorepo || null
  }

  get options() {
    return this.values
  }

  get(key: string) {
    // Return undefined for these flags by default
    if (
      key === 'scope' ||
      key === 'workspace' ||
      key === 'workspace-group' ||
      key === 'recursive'
    ) {
      return this.values[key] || undefined
    }
    return this.values[key]
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
      path: process.cwd() + '/package.json',
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

t.test('version command with scope', async t => {
  t.test('updates packages matching scope query', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
        },
      },
    })

    // Mock the graph search to return workspace nodes
    const mockNodes = [
      {
        id: 'file:packages/a',
        toJSON: () => ({ location: 'packages/a' }),
      },
      {
        id: 'file:packages/b',
        toJSON: () => ({ location: 'packages/b' }),
      },
    ]

    const mockQuery = {
      search: async () => ({ nodes: mockNodes }),
    }

    const cmd = await mockCommand(t, {
      '@vltpkg/git': mockGit,
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          search = mockQuery.search
        },
      },
    })

    const conf = new MockConfig(
      ['patch'],
      {
        scope: ':workspace',
        monorepo: [
          {
            name: '@test/a',
            fullpath: resolve(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: resolve(dir, 'packages/b'),
          },
        ],
      },
      { version: '1.0.0' },
    )
    conf.projectRoot = dir
    conf.writtenManifests = []

    // Override packageJson.find to work with test directories
    conf.values.packageJson.find = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return resolve(dir, 'packages/a/package.json')
      }
      if (cwd.includes('packages/b')) {
        return resolve(dir, 'packages/b/package.json')
      }
      return resolve(dir, 'package.json')
    }

    // Override packageJson.read to return correct versions
    conf.values.packageJson.read = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return { name: '@test/a', version: '1.0.0' }
      }
      if (cwd.includes('packages/b')) {
        return { name: '@test/b', version: '2.0.0' }
      }
      return { name: 'root', version: '1.0.0' }
    }

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(results.length, 2, 'should update both workspaces')

    const [resultA, resultB] = results
    t.equal(resultA!.oldVersion, '1.0.0')
    t.equal(resultA!.newVersion, '1.0.1')
    t.equal(resultB!.oldVersion, '2.0.0')
    t.equal(resultB!.newVersion, '2.0.1')
  })

  t.test('handles empty scope query results', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: [] }),
    })

    const cmd = await mockCommand(t, {
      '@vltpkg/git': mockGit,
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          search = async () => ({ nodes: [] })
        },
      },
    })

    const conf = new MockConfig(['patch'], {
      scope: ':workspace#nonexistent',
      monorepo: [],
    })
    conf.projectRoot = dir

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return empty array')
    const results = result as CommandResultSingle[]
    t.equal(results.length, 0, 'should have no results')
  })
})

t.test('version command with workspace paths', async t => {
  t.test('updates specific workspace paths', async t => {
    const semverModule = await import('@vltpkg/semver')

    const cmd = await mockCommand(t, {
      '@vltpkg/semver': semverModule,
      '@vltpkg/git': mockGit,
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
        },
      },
    })

    const conf = new MockConfig(['minor'], {
      workspace: ['packages/a'],
      monorepo: [
        {
          name: '@test/a',
          fullpath: resolve(dir, 'packages/a'),
        },
      ],
    })
    conf.projectRoot = dir
    conf.writtenManifests = []

    // Override packageJson.find to work with test directories
    conf.values.packageJson.find = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return resolve(dir, 'packages/a/package.json')
      }
      return null
    }

    // Override packageJson.read to return correct versions
    conf.values.packageJson.read = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return { name: '@test/a', version: '1.0.0' }
      }
      return { name: 'root', version: '1.0.0' }
    }

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(
      results.length,
      1,
      'should update only specified workspace',
    )

    const [resultA] = results
    t.equal(resultA!.oldVersion, '1.0.0')
    t.equal(resultA!.newVersion, '1.1.0')
  })
})

t.test('version command with workspace-group', async t => {
  t.test('updates all workspaces in group', async t => {
    const semverModule = await import('@vltpkg/semver')

    const cmd = await mockCommand(t, {
      '@vltpkg/semver': semverModule,
      '@vltpkg/git': mockGit,
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
        },
      },
    })

    const conf = new MockConfig(['major'], {
      'workspace-group': ['packages'],
      monorepo: [
        {
          name: '@test/a',
          fullpath: resolve(dir, 'packages/a'),
        },
        {
          name: '@test/b',
          fullpath: resolve(dir, 'packages/b'),
        },
      ],
    })
    conf.projectRoot = dir
    conf.writtenManifests = []

    // Override packageJson.find to work with test directories
    conf.values.packageJson.find = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return resolve(dir, 'packages/a/package.json')
      }
      if (cwd.includes('packages/b')) {
        return resolve(dir, 'packages/b/package.json')
      }
      return null
    }

    // Override packageJson.read to return correct versions
    conf.values.packageJson.read = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return { name: '@test/a', version: '1.0.0' }
      }
      if (cwd.includes('packages/b')) {
        return { name: '@test/b', version: '2.0.0' }
      }
      return { name: 'root', version: '1.0.0' }
    }

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(
      results.length,
      2,
      'should update all workspaces in group',
    )

    const [resultA, resultB] = results
    t.equal(resultA!.oldVersion, '1.0.0')
    t.equal(resultA!.newVersion, '2.0.0')
    t.equal(resultB!.oldVersion, '2.0.0')
    t.equal(resultB!.newVersion, '3.0.0')
  })
})

t.test('version command with recursive', async t => {
  t.test('updates all workspaces recursively', async t => {
    const semverModule = await import('@vltpkg/semver')

    const cmd = await mockCommand(t, {
      '@vltpkg/semver': semverModule,
      '@vltpkg/git': mockGit,
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
        },
      },
    })

    const conf = new MockConfig(['prerelease'], {
      recursive: true,
      monorepo: [
        {
          name: '@test/a',
          fullpath: resolve(dir, 'packages/a'),
        },
        {
          name: '@test/b',
          fullpath: resolve(dir, 'packages/b'),
        },
      ],
    })
    conf.projectRoot = dir
    conf.writtenManifests = []

    // Override packageJson.find to work with test directories
    conf.values.packageJson.find = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return resolve(dir, 'packages/a/package.json')
      }
      if (cwd.includes('packages/b')) {
        return resolve(dir, 'packages/b/package.json')
      }
      return null
    }

    // Override packageJson.read to return correct versions
    conf.values.packageJson.read = (cwd: string) => {
      if (cwd.includes('packages/a')) {
        return { name: '@test/a', version: '1.0.0' }
      }
      if (cwd.includes('packages/b')) {
        return { name: '@test/b', version: '2.0.0' }
      }
      return { name: 'root', version: '1.0.0' }
    }

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(results.length, 2, 'should update all workspaces')

    const [resultA, resultB] = results
    t.equal(resultA!.oldVersion, '1.0.0')
    t.equal(resultA!.newVersion, '1.0.1-pre')
    t.equal(resultB!.oldVersion, '2.0.0')
    t.equal(resultB!.newVersion, '2.0.1-pre')
  })
})

t.test('human view with arrays', async t => {
  const cmd = await mockCommand(t)

  t.test('formats multiple results', async t => {
    const results = [
      {
        oldVersion: '1.0.0',
        newVersion: '1.0.1',
        dir: '/test/a',
      },
      {
        oldVersion: '2.0.0',
        newVersion: '2.0.1',
        dir: '/test/b',
        committed: ['package.json'],
        tag: 'v2.0.1',
      },
    ]

    const output = cmd.views.human(results)
    const lines = output.split('\n')
    t.equal(lines.length, 2)
    t.equal(lines[0], 'v1.0.1')
    t.equal(lines[1], 'v2.0.1 +commit +tag')
  })
})

t.test('version command fallback to projectRoot', async t => {
  t.test(
    'uses projectRoot when package.json.find returns null',
    async t => {
      const semverModule = await import('@vltpkg/semver')

      const cmd = await mockCommand(t, {
        '@vltpkg/semver': semverModule,
        '@vltpkg/git': mockGit,
      })

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'root',
          version: '1.0.0',
        }),
      })

      const conf = new MockConfig(['patch'], {})
      conf.projectRoot = dir
      conf.writtenManifests = []

      // Override packageJson.find to return null for process.cwd()
      conf.values.packageJson.find = (cwd: string) => {
        if (cwd === dir) {
          return resolve(dir, 'package.json')
        }
        return null // This will trigger the fallback to projectRoot
      }

      // Override packageJson.read
      conf.values.packageJson.read = (_cwd: string) => {
        return { name: 'root', version: '1.0.0' }
      }

      const result = await cmd.command(
        conf as unknown as LoadedConfig,
      )

      t.notOk(Array.isArray(result), 'should return single result')
      const singleResult = result as CommandResultSingle
      t.equal(singleResult.oldVersion, '1.0.0')
      t.equal(singleResult.newVersion, '1.0.1')
      t.equal(singleResult.dir, dir)
    },
  )
})

t.test('version command with empty monorepo', async t => {
  t.test(
    'returns empty array when recursive with no workspaces',
    async t => {
      const semverModule = await import('@vltpkg/semver')

      const cmd = await mockCommand(t, {
        '@vltpkg/semver': semverModule,
        '@vltpkg/git': mockGit,
      })

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'root',
          version: '1.0.0',
        }),
      })

      const conf = new MockConfig(['patch'], {
        recursive: true,
        monorepo: [], // Empty monorepo array
      })
      conf.projectRoot = dir
      conf.writtenManifests = []

      const result = await cmd.command(
        conf as unknown as LoadedConfig,
      )

      t.ok(Array.isArray(result), 'should return array')
      const results = result as CommandResultSingle[]
      t.equal(results.length, 0, 'should have no results')
    },
  )

  t.test('handles null monorepo with recursive flag', async t => {
    const semverModule = await import('@vltpkg/semver')

    const cmd = await mockCommand(t, {
      '@vltpkg/semver': semverModule,
      '@vltpkg/git': mockGit,
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
    })

    const conf = new MockConfig(['patch'], {
      recursive: true,
      monorepo: null, // Null monorepo (undefined)
    })
    conf.projectRoot = dir
    conf.writtenManifests = []

    const result = await cmd.command(conf as unknown as LoadedConfig)

    t.ok(Array.isArray(result), 'should return array')
    const results = result as CommandResultSingle[]
    t.equal(
      results.length,
      0,
      'should have no results when monorepo is null',
    )
  })
})
