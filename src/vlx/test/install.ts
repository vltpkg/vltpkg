import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { NormalizedManifest } from '@vltpkg/types'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import type { VlxManifest, VlxOptions } from '../src/index.ts'
import { mkdirSync, readFileSync } from 'node:fs'
import { error } from '@vltpkg/error-cause'

const getVlxInstall = async (
  t: Test,
  {
    // just to verify that install returns whatever vlxInfo reports
    mockVlxInfo = (path: string, options: VlxOptions) => ({
      path,
      options,
    }),
    resolvedIntegrity = 'sha512-AO2ac6pjRB3SJmGJo+v5/aK6Omggp6fsLrs6wN9bd35ulu4cCwaAU9+7ZhXjeqHVkaHThLuzH0nZr0YpCDhygg==',
    installedIntegrity,
    resolveError,
    dir = t.testdir({}),
  }: {
    mockVlxInfo?: (
      path: string,
      options: VlxOptions,
      manifest?: NormalizedManifest,
    ) => { path: string; options: VlxOptions }
    /** what package-info resolves to before the install; null for none */
    resolvedIntegrity?: string | null
    /** what the install hashed while extracting */
    installedIntegrity?: string
    /** what package-info throws instead of resolving */
    resolveError?: Error
    /** an earlier helper's dir to go on in, instead of a fresh one */
    dir?: string
  } = {},
) => {
  const installs: [string, VlxManifest][] = []
  const packageJson = new PackageJson()

  const mockInstall = async (options: VlxOptions) => {
    const { projectRoot, packageJson } = options
    t.equal(options['stale-while-revalidate-factor'], Infinity)
    installs.push([projectRoot, packageJson.read(projectRoot)])
    return {
      graph: {
        mainImporter: {
          edgesOut: new Map([
            ['abbrev', { to: { integrity: installedIntegrity } }],
          ]),
        },
      },
    }
  }

  class MockPackageInfoClient {
    resolve() {
      if (resolveError) throw resolveError
      return {
        resolved:
          'https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz',
        integrity: resolvedIntegrity ?? undefined,
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
    dir,
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
  t.equal(
    installs[0]?.[1].vlx?.spec,
    String(Spec.parseArgs('abbrev')),
    'records the spec it was installed for',
  )
})

t.test('pins the integrity the install hashed', async t => {
  const integrity = `sha512-${'a'.repeat(86)}==`
  const { vlxInstall, options, expectedInstallDir, installs } =
    await getVlxInstall(t, {
      // an abbreviated packument resolves without one
      resolvedIntegrity: null,
      installedIntegrity: integrity,
    })
  await vlxInstall(
    'abbrev',
    { ...options, yes: true },
    async () => 'no',
  )
  t.equal(
    installs[0]?.[1].vlx?.integrity,
    undefined,
    'none before install',
  )
  const written = JSON.parse(
    readFileSync(resolve(expectedInstallDir, 'package.json'), 'utf8'),
  )
  t.equal(written.vlx.integrity, integrity, 'recorded after install')
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

t.test('host unreachable', async t => {
  const away = error('could not resolve', {
    cause: error('Request failed', { code: 'EREQUEST' }),
  })

  t.test('never installed: the error', async t => {
    const { vlxInstall, options } = await getVlxInstall(t, {
      resolveError: away,
    })
    await t.rejects(
      vlxInstall('abbrev', { ...options, yes: true }),
      away,
    )
  })

  t.test('installed before: the last install', async t => {
    const { vlxInstall, options, expectedInstallDir, installs, dir } =
      await getVlxInstall(t)
    await vlxInstall('abbrev', { ...options, yes: true })
    t.equal(installs.length, 1)

    const offline = await getVlxInstall(t, {
      resolveError: away,
      dir,
    })
    t.match(
      await offline.vlxInstall(
        'abbrev',
        offline.options,
        async () => 'no',
      ),
      { path: expectedInstallDir },
      'no prompt, no install',
    )
    t.equal(installs.length, 1, 'nothing installed')
    await t.rejects(
      offline.vlxInstall('abbrev@2', offline.options),
      away,
      'another spec: the error',
    )
  })

  t.test('the host answered: the error', async t => {
    const { vlxInstall, options, dir } = await getVlxInstall(t)
    await vlxInstall('abbrev', { ...options, yes: true })
    const gone = error('not found', { code: 'ERESOLVE' })
    const answered = await getVlxInstall(t, {
      resolveError: gone,
      dir,
    })
    await t.rejects(
      answered.vlxInstall('abbrev', answered.options),
      gone,
    )
  })
})
