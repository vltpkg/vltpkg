import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { VlxOptions } from '../src/index.ts'

const installs: [string, Manifest][] = []
const mockInstall = async (options: VlxOptions) => {
  const { projectRoot, packageJson } = options
  t.equal(options['stale-while-revalidate-factor'], Infinity)
  installs.push([projectRoot, packageJson.read(projectRoot)])
}
t.afterEach(() => (installs.length = 0))

const packageJson = new PackageJson()

// just to verify that install returns whatever vlxInfo reports
const mockVlxInfo = async (path: string, options: VlxOptions) => ({
  path,
  options,
})

const dir = t.testdir({})
class MockXDG {
  path: string
  constructor(path: string) {
    this.path = resolve(dir, path)
  }
  data(path = '') {
    return resolve(this.path, path)
  }
}

const expectedInstallDir = resolve(
  t.testdirName,
  'vlt/vlx/abbrev-c37c2618',
)

class MockPackageInfoClient {
  resolve() {
    return {
      resolved:
        'https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz',
      integrity:
        'sha512-AO2ac6pjRB3SJmGJo+v5/aK6Omggp6fsLrs6wN9bd35ulu4cCwaAU9+7ZhXjeqHVkaHThLuzH0nZr0YpCDhygg==',
    }
  }
}

const getVlxInstall = async (t: Test) => {
  return await t.mockImport<typeof import('../src/install.ts')>(
    '../src/install.ts',
    {
      '@vltpkg/package-info': {
        PackageInfoClient: MockPackageInfoClient,
      },
      '@vltpkg/xdg': { XDG: MockXDG },
      '@vltpkg/graph': { install: mockInstall },
      '../src/info.ts': { vlxInfo: mockVlxInfo },
    },
  )
}

t.test('need an install, but do not accept prompt', async t => {
  const { vlxInstall } = await getVlxInstall(t)

  await t.rejects(
    vlxInstall(
      'abbrev',
      { packageRoot: t.testdirName } as unknown as VlxOptions,
      async () => 'no',
    ),
    {
      message: 'Operation aborted',
    },
  )
})

t.test('need an install, accept prompt with --yes', async t => {
  const { vlxInstall } = await getVlxInstall(t)

  const result = await vlxInstall(
    'abbrev',
    {
      packageRoot: t.testdirName,
      yes: true,
      packageJson,
    } as unknown as VlxOptions,
    async () => 'no',
  )

  t.match(result, {
    path: expectedInstallDir,
    options: {
      packageRoot: t.testdirName,
      yes: true,
      'stale-while-revalidate-factor': Infinity,
    },
  })
  t.equal(installs[0]?.[0], expectedInstallDir)
  t.equal(installs.length, 1)
  t.strictSame(installs[0]?.[1].dependencies, {
    abbrev: 'https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz',
  })
})

t.test('need no install, prompt not relevant', async t => {
  const { vlxInstall } = await getVlxInstall(t)

  const result = await vlxInstall(
    Spec.parseArgs('abbrev'),
    {
      packageRoot: t.testdirName,
      packageJson,
    } as unknown as VlxOptions,
    async () => 'no',
  )

  t.match(result, {
    path: expectedInstallDir,
    options: {
      packageRoot: t.testdirName,
      'stale-while-revalidate-factor': Infinity,
    },
  })
  t.strictSame(installs, [], 'no installs needed')
})

t.test('broken install directory should be retried', async t => {
  // Create a directory with broken installation using t.testdir
  const brokenInstallDir = t.testdir({
    vlt: {
      vlx: {
        'abbrev-c37c2618': {
          'package.json': JSON.stringify({
            name: 'vlx',
            dependencies: {
              abbrev: 'https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz',
            },
          }),
          // Missing or broken node_modules directory
        },
      },
    },
  })

  // Mock XDG to use our broken install directory
  class MockXDGBroken {
    path: string
    constructor(path: string) {
      this.path = resolve(brokenInstallDir, path)
    }
    data(path = '') {
      return resolve(this.path, path)
    }
  }

  // For this test, use real vlxInfo to test the fix
  const { vlxInstall } = await t.mockImport<typeof import('../src/install.ts')>(
    '../src/install.ts',
    {
      '@vltpkg/package-info': {
        PackageInfoClient: MockPackageInfoClient,
      },
      '@vltpkg/xdg': { XDG: MockXDGBroken },
      '@vltpkg/graph': { install: mockInstall },
      // Use real vlxInfo to test the fix
    },
  )

  const expectedBrokenDir = resolve(brokenInstallDir, 'vlt/vlx/abbrev-c37c2618')

  // With the fix, this should succeed by cleaning up and retrying installation
  const result = await vlxInstall(
    'abbrev',
    {
      packageRoot: t.testdirName,
      yes: true,
      packageJson,
    } as unknown as VlxOptions,
  )

  t.match(result, {
    path: expectedBrokenDir,
    options: {
      packageRoot: t.testdirName,
      yes: true,
      'stale-while-revalidate-factor': Infinity,
    },
  })
  t.equal(installs.length, 1, 'should retry installation for broken directory')
})
