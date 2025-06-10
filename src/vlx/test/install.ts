import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { VlxOptions } from '../src/index.ts'
import { mkdirSync } from 'node:fs'

const getVlxInstall = async (
  t: Test,
  {
    // just to verify that install returns whatever vlxInfo reports
    mockVlxInfo = (path: string, options: VlxOptions) => ({
      path,
      options,
    }),
  }: {
    mockVlxInfo?: (
      path: string,
      options: VlxOptions,
      manifest?: Manifest,
    ) => { path: string; options: VlxOptions }
  } = {},
) => {
  const installs: [string, Manifest][] = []
  const packageJson = new PackageJson()
  const dir = t.testdir({})

  const mockInstall = async (options: VlxOptions) => {
    const { projectRoot, packageJson } = options
    t.equal(options['stale-while-revalidate-factor'], Infinity)
    installs.push([projectRoot, packageJson.read(projectRoot)])
  }

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

  class MockXDG {
    path: string
    constructor(path: string) {
      this.path = resolve(dir, path)
    }
    data(path = '') {
      return resolve(this.path, path)
    }
  }

  const { vlxInstall } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '@vltpkg/package-info': {
      PackageInfoClient: MockPackageInfoClient,
    },
    '@vltpkg/xdg': { XDG: MockXDG },
    '@vltpkg/graph': { install: mockInstall },
    '../src/info.ts': { vlxInfo: mockVlxInfo },
  })

  return {
    vlxInstall,
    options: {
      packageRoot: t.testdirName,
      packageJson,
    } as unknown as VlxOptions,
    expectedInstallDir: resolve(
      t.testdirName,
      'vlt/vlx/abbrev-c37c2618',
    ),
    installs,
    clearInstalls: () => (installs.length = 0),
  }
}

t.test('need an install, but do not accept prompt', async t => {
  const { vlxInstall, options } = await getVlxInstall(t)

  await t.rejects(
    vlxInstall('abbrev', options, async () => 'no'),
    {
      message: 'Operation aborted',
    },
  )
})

t.test('need an install, accept prompt with --yes', async t => {
  const { vlxInstall, options, expectedInstallDir, installs } =
    await getVlxInstall(t)

  const result = await vlxInstall(
    'abbrev',
    { ...options, yes: true },
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
  const { vlxInstall, options, expectedInstallDir, clearInstalls } =
    await getVlxInstall(t)

  await vlxInstall(
    'abbrev',
    { ...options, yes: true },
    async () => 'no',
  )
  clearInstalls()

  const result = await vlxInstall(
    Spec.parseArgs('abbrev'),
    options,
    async () => 'no',
  )

  t.match(result, {
    path: expectedInstallDir,
    options: {
      packageRoot: t.testdirName,
      'stale-while-revalidate-factor': Infinity,
    },
  })
})

t.test('retries if vlx info fails', async t => {
  const { vlxInstall, options, expectedInstallDir, installs } =
    await getVlxInstall(t, {
      mockVlxInfo: (path, options, manifest) => {
        if (manifest) {
          return { path, options }
        }
        throw new Error('Initial vlx info failed')
      },
    })

  mkdirSync(expectedInstallDir, { recursive: true })

  const result = await vlxInstall('abbrev', { ...options, yes: true })

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
