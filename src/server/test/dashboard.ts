import { PackageJson } from '@vltpkg/package-json'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'

const homedir = t.testdirName
const { Dashboard } = await t.mockImport<
  typeof import('../src/dashboard.ts')
>('../src/dashboard.ts', {
  'node:os': t.createMock(await import('node:os'), {
    homedir: () => homedir,
  }),
  '@vltpkg/git': {
    getUser: async () => ({
      name: 'Person Name',
      email: 'e@ma.il',
    }),
  },
})

t.test('dashboard construction', async t => {
  const publicDir = t.testdirName
  const scurry = new PathScurry(publicDir)
  const packageJson = new PackageJson()

  const d = new Dashboard({
    publicDir,
    scurry,
    packageJson,
    'dashboard-root': [],
  })
  t.strictSame(d.dashboardRoot, [homedir])
  const d2 = new Dashboard({
    publicDir,
    scurry,
    packageJson,
    'dashboard-root': [t.testdirName],
  })
  t.strictSame(d2.dashboardRoot, [t.testdirName])
})

t.test('dashboard construction with homedir error', async t => {
  const mockOs = t.createMock(await import('node:os'), {
    homedir: () => {
      throw new Error('Permission denied')
    },
  })

  const { Dashboard: DashboardWithError } = await t.mockImport<
    typeof import('../src/dashboard.ts')
  >('../src/dashboard.ts', {
    'node:os': mockOs,
    './get-readable-path.ts': await t.mockImport<
      typeof import('../src/get-readable-path.ts')
    >('../src/get-readable-path.ts', {
      'node:os': mockOs,
    }),
    '@vltpkg/git': {
      getUser: async () => ({
        name: 'Person Name',
        email: 'e@ma.il',
      }),
    },
  })

  const publicDir = t.testdirName
  const scurry = new PathScurry(publicDir)
  const packageJson = new PackageJson()

  const d = new DashboardWithError({
    publicDir,
    scurry,
    packageJson,
    'dashboard-root': [],
  })
  t.strictSame(d.dashboardRoot, [dirname(process.cwd())])
})

t.test('update projects, with dashboard', async t => {
  const dir = t.testdir({
    public: {
      'dashboard.json': JSON.stringify({
        just: 'some preexisting thing',
      }),
    },
    projects: {
      x: {
        'package.json': JSON.stringify({ name: 'x' }),
      },
      y: { hasNo: 'package.json' },
      z: { 'package.json': 'invalid json' },
    },
  })
  const publicDir = resolve(dir, 'public')
  const scurry = new PathScurry(publicDir)
  const packageJson = new PackageJson()
  const d = new Dashboard({
    publicDir,
    scurry,
    packageJson,
    'dashboard-root': [resolve(dir, 'projects')],
  })
  t.equal(await d.update(), true)
  const dj = resolve(dir, 'public/dashboard.json')
  t.matchOnly(JSON.parse(readFileSync(dj, 'utf8')), {
    cwd: process.cwd(),
    dashboardProjectLocations: [
      {
        path: resolve(dir, 'projects'),
        readablePath: join(
          '~-update-projects-with-dashboard',
          'projects',
        ),
      },
    ],
    defaultAuthor: 'Person Name <e@ma.il>',
    projects: [
      {
        name: 'x',
        readablePath: join(
          '~-update-projects-with-dashboard',
          'projects',
          'x',
        ),
        path: resolve(dir, 'projects/x'),
        manifest: { name: 'x' },
        tools: ['js'],
        mtime: Number,
      },
    ],
  })
})

t.test('update projects, no dashboard', async t => {
  const dir = t.testdir({
    public: {
      'dashboard.json': JSON.stringify({
        just: 'some preexisting thing',
      }),
    },
    projects: {},
  })
  const publicDir = resolve(dir, 'public')
  const scurry = new PathScurry(publicDir)
  const packageJson = new PackageJson()
  const d = new Dashboard({
    publicDir,
    scurry,
    packageJson,
    'dashboard-root': [resolve(dir, 'projects')],
  })
  t.equal(await d.update(), false)
  const dj = resolve(dir, 'public/dashboard.json')
  const json = JSON.parse(readFileSync(dj, 'utf8'))
  t.strictSame(json.projects, [], 'projects list is empty')
  t.strictSame(
    json.dashboardProjectLocations,
    [
      {
        path: resolve(dir, 'projects'),
        readablePath: join(
          '~-update-projects-no-dashboard',
          'projects',
        ),
      },
    ],
    'dashboard locations still present',
  )
})

t.test(
  'update projects, with dashboard, no manifest name',
  async t => {
    const dir = t.testdir({
      public: {
        'dashboard.json': JSON.stringify({
          just: 'some preexisting thing',
        }),
      },
      projects: {
        x: {
          'package.json': JSON.stringify({}),
        },
        y: { hasNo: 'package.json' },
        z: { 'package.json': 'invalid json' },
      },
    })
    const publicDir = resolve(dir, 'public')
    const scurry = new PathScurry(publicDir)
    const packageJson = new PackageJson()
    const d = new Dashboard({
      publicDir,
      scurry,
      packageJson,
      'dashboard-root': [resolve(dir, 'projects')],
    })
    t.equal(await d.update(), true)
    const dj = resolve(dir, 'public/dashboard.json')
    t.matchOnly(JSON.parse(readFileSync(dj, 'utf8')), {
      cwd: process.cwd(),
      dashboardProjectLocations: [
        {
          path: resolve(dir, 'projects'),
          readablePath: join(
            '~-update-projects-with-dashboard-no-manifest-name',
            'projects',
          ),
        },
      ],
      defaultAuthor: 'Person Name <e@ma.il>',
      projects: [
        {
          name: 'x',
          readablePath: join(
            '~-update-projects-with-dashboard-no-manifest-name',
            'projects',
            'x',
          ),
          path: resolve(dir, 'projects/x'),
          manifest: {},
          tools: ['js'],
          mtime: Number,
        },
      ],
    })
  },
)
