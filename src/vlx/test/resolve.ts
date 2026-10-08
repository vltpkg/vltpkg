import type { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import type { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import t from 'tap'
import type { VlxInfo } from '../src/index.ts'

const mockVlxInstall = (t: Test) => ({
  vlxInstall: async (pkgSpec: Spec): Promise<VlxInfo> => {
    const path = resolve(
      t.testdirName,
      pkgSpec.name === 'abbrev' ? 'abbrevhash' : 'globhash',
    )

    return pkgSpec.name === 'abbrev' ?
        {
          path,
          name: 'abbrev',
          resolved:
            'https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz',
          arg0: undefined,
        }
      : {
          path,
          name: 'glob',
          resolved:
            'https://registry.npmjs.org/glob/-/glob-11.0.1.tgz',
          arg0: 'glob',
        }
  },
})

t.beforeEach(() => (addedToPath.length = 0))
const addedToPath: string[] = []
const mockAddToPATH = {
  addToPATH: (path: string) => addedToPath.push(path),
}

const mockXDG = (t: Test) => ({
  XDG: class {
    cache(p = '') {
      return resolve(t.testdirName, 'cache', p)
    }
  },
})

const getVlxResolve = async (t: Test) =>
  await t.mockImport<typeof import('../src/resolve.ts')>(
    '../src/resolve.ts',
    {
      '../src/install.ts': mockVlxInstall(t),
      '../src/add-to-path.ts': mockAddToPATH,
      '@vltpkg/xdg': mockXDG(t),
    },
  )

const packageJson = new PackageJson()
const mockPackageInfoClient = {} as unknown as PackageInfoClient

t.test('no pkgOption, no arg, return undefined', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({})
  const result = await vlxResolve([], {
    projectRoot,
    packageJson,
    scurry: new PathScurry(t.testdirName),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  })
  t.strictSame(addedToPath, [])
  t.equal(result, undefined)
})

t.test('no pkgOption, has arg, bin found locally', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({
    node_modules: {
      glob: {
        dist: {
          esm: {
            'bin.mjs': '',
          },
        },
      },
      '.bin': {
        glob: t.fixture('symlink', 'glob/dist/esm/bin.mjs'),
        'glob.cmd': '',
        'glob.ps1': '',
      },
    },
  })
  t.chdir(projectRoot)
  const result = await vlxResolve(['glob'], {
    projectRoot,
    packageJson,
    scurry: new PathScurry(t.testdirName),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  })
  t.strictSame(addedToPath, [])
  t.equal(result, resolve(projectRoot, 'node_modules/.bin/glob'))
})

t.test('no pkgOption, has arg, not found locally', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({})
  t.chdir(projectRoot)
  const result = await vlxResolve(['glob'], {
    projectRoot,
    packageJson,
    scurry: new PathScurry(t.testdirName),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  })
  t.strictSame(addedToPath, [
    resolve(t.testdirName, 'globhash/node_modules/.bin'),
  ])
  t.equal(result, 'glob')
})

t.test('pkgOption is bare, use local', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({
    node_modules: {
      glob: {
        'package.json': JSON.stringify({
          name: 'glob',
          bin: 'dist/esm/bin.mjs',
        }),
        dist: {
          esm: {
            'bin.mjs': '',
          },
        },
      },
      '.bin': {
        glob: t.fixture('symlink', 'glob/dist/esm/bin.mjs'),
        'glob.cmd': '',
        'glob.ps1': '',
      },
    },
  })
  t.chdir(projectRoot)
  const result = await vlxResolve([], {
    package: 'glob',
    projectRoot,
    packageJson,
    scurry: new PathScurry(t.testdirName),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  })
  t.strictSame(addedToPath, [
    resolve(projectRoot, 'node_modules/.bin'),
  ])
  t.equal(result, undefined)
})

t.test('pkgOption has version, use global', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({
    node_modules: {
      glob: {
        'package.json': JSON.stringify({
          name: 'glob',
          bin: 'dist/esm/bin.mjs',
        }),
        dist: {
          esm: {
            'bin.mjs': '',
          },
        },
      },
      '.bin': {
        glob: t.fixture('symlink', 'glob/dist/esm/bin.mjs'),
        'glob.cmd': '',
        'glob.ps1': '',
      },
    },
  })
  t.chdir(projectRoot)
  const result = await vlxResolve(['glob@1.2.3'], {
    projectRoot,
    packageJson,
    scurry: new PathScurry(t.testdirName),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  })
  t.strictSame(addedToPath, [
    resolve(projectRoot, 'globhash/node_modules/.bin'),
  ])
  t.equal(result, 'glob')
})

t.test('pkgOption has version, use global, cannot infer', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const projectRoot = t.testdir({
    abbrevhash: {
      node_modules: {
        abbrev: {
          'package.json': JSON.stringify({
            bin: {
              foo: 'bar',
            },
          }),
        },
      },
    },
    node_modules: {
      abbrev: {
        'package.json': JSON.stringify({
          name: 'abbrev',
        }),
      },
    },
  })
  t.chdir(projectRoot)
  await t.rejects(
    vlxResolve(['abbrev@1.2.3'], {
      projectRoot,
      packageJson,
      scurry: new PathScurry(t.testdirName),
      packageInfo: mockPackageInfoClient,
      allowScripts: '*',
    }),
    {
      message: 'Package executable could not be inferred',
      cause: {
        found: { foo: 'bar' },
      },
    },
  )
  t.strictSame(addedToPath, [
    resolve(t.testdirName, 'abbrevhash/node_modules/.bin'),
  ])
})

const localFixture = (t: Test) => {
  const bin = '#!/usr/bin/env node\n'
  const testdir = t.testdir({
    proj: {
      'package.json': JSON.stringify({
        name: 'my-tool',
        version: '1.0.0',
        bin: { 'my-tool': 'cli.js' },
      }),
      'cli.js': bin,
      sub: {},
    },
    multi: {
      'package.json': JSON.stringify({
        name: 'multi',
        version: '1.0.0',
        bin: { a: 'a.js', b: 'b.js' },
      }),
      'a.js': bin,
      'b.js': bin,
    },
    'x.tgz': '',
  })
  const options = {
    projectRoot: testdir,
    packageJson,
    scurry: new PathScurry(testdir),
    packageInfo: mockPackageInfoClient,
    allowScripts: '*',
  }
  return { testdir, proj: resolve(testdir, 'proj'), options }
}

// PATH holds the local dir's shim dir
const assertShimDir = async (t: Test, dir: string) => {
  const { vlxLocal } = await t.mockImport<
    typeof import('../src/local.ts')
  >('../src/local.ts', { '@vltpkg/xdg': mockXDG(t) })
  const { path } = await vlxLocal(dir, new PackageJson())
  t.strictSame(addedToPath, [resolve(path, 'node_modules/.bin')])
}

t.test('local dir, dot', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const { proj, options } = localFixture(t)
  t.chdir(proj)
  t.equal(
    await vlxResolve(['.'], { ...options, projectRoot: proj }),
    'my-tool',
  )
  await assertShimDir(t, proj)
})

t.test('local dir, dotdot', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const { proj, options } = localFixture(t)
  t.chdir(resolve(proj, 'sub'))
  t.equal(
    await vlxResolve(['..'], { ...options, projectRoot: proj }),
    'my-tool',
  )
  await assertShimDir(t, proj)
})

t.test('local dir, --package=dot', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const { proj, options } = localFixture(t)
  t.chdir(proj)
  t.equal(
    await vlxResolve([], {
      ...options,
      package: '.',
      projectRoot: proj,
    }),
    undefined,
  )
  await assertShimDir(t, proj)
})

t.test('local dir, cannot infer', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const { testdir, options } = localFixture(t)
  const multi = resolve(testdir, 'multi')
  t.chdir(multi)
  await t.rejects(
    vlxResolve(['.'], { ...options, projectRoot: multi }),
    {
      message: 'Package executable could not be inferred',
      cause: {
        name: 'multi',
        found: { a: 'a.js', b: 'b.js' },
      },
    },
  )
})

t.test('local tarball installs', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const { testdir, options } = localFixture(t)
  t.chdir(testdir)
  t.equal(await vlxResolve(['./x.tgz'], options), 'glob')
  t.strictSame(addedToPath, [
    resolve(testdir, 'globhash/node_modules/.bin'),
  ])
})

t.test('local dir, path-like arg0 skips installed bins', async t => {
  const { vlxResolve } = await getVlxResolve(t)
  const testdir = t.testdir({
    proj: {
      'package.json': JSON.stringify({ name: 'proj', bin: 'cli.js' }),
      'cli.js': '#!/usr/bin/env node\n',
    },
    node_modules: {
      proj: { 'bin.js': '' },
      '.bin': {
        proj: t.fixture('symlink', '../proj/bin.js'),
        'proj.cmd': '',
        'proj.ps1': '',
      },
    },
  })
  t.chdir(testdir)
  t.equal(
    await vlxResolve(['./proj'], {
      projectRoot: testdir,
      packageJson,
      scurry: new PathScurry(testdir),
      packageInfo: mockPackageInfoClient,
      allowScripts: '*',
    }),
    'proj',
  )
  await assertShimDir(t, resolve(testdir, 'proj'))
})
