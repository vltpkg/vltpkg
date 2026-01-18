import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'

const { updateGraphData } = await t.mockImport<
  typeof import('../src/graph-data.ts')
>('../src/graph-data.ts', {
  '@vltpkg/security-archive': {
    SecurityArchive: {
      start: async () => ({
        ok: false,
      }),
    },
  },
})

t.test('graph data for vlt project', async t => {
  const { updateGraphData } = await t.mockImport<
    typeof import('../src/graph-data.ts')
  >('../src/graph-data.ts', {
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => ({
          [joinDepIDTuple(['registry', '', 'abbrev@1.2.3'])]: {
            id: '99923218962',
            author: ['npm'],
            size: 13003,
            type: 'npm',
            name: 'abbrev',
            version: '1.2.3',
            alerts: [],
          },
          ok: true,
        }),
      },
    },
  })

  const rootDepID = joinDepIDTuple(['file', '.'])
  const abbrevDepID = joinDepIDTuple(['registry', '', 'abbrev@1.2.3'])
  const dir = t.testdir({
    tmp: {
      'graph.json': JSON.stringify({
        just: { some: { prexisting: 'junk' } },
      }),
    },
    project: {
      'vlt.json': JSON.stringify({
        color: true,
      }),
      'package.json': JSON.stringify({
        dependencies: { abbrev: '*' },
      }),
      node_modules: {
        abbrev: t.fixture('symlink', `.vlt/${abbrevDepID}`),
        '.vlt': {
          [abbrevDepID]: {
            'package.json': JSON.stringify({
              name: 'abbrev',
              version: '1.2.3',
            }),
          },
        },
        '.vlt-lock.json': JSON.stringify({
          options: {},
          nodes: {
            [abbrevDepID]: [
              0,
              'abbrev',
              null,
              null,
              `./node_modules/.vlt/${abbrevDepID}`,
              { name: 'abbrev', version: '1.2.3' },
            ],
          },
          edges: {
            [`${rootDepID} abbrev`]: `prod * ${abbrevDepID}`,
            [`${abbrevDepID} abbrev`]: `prod * ${abbrevDepID}`,
          },
        }),
      },
    },
  })
  const projectRoot = resolve(dir, 'project')
  const tmp = resolve(dir, 'tmp')
  await updateGraphData(
    {
      projectRoot,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
    },
    tmp,
    true,
  )
  const result = JSON.parse(
    readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
  )
  t.match(result, {
    hasDashboard: true,
    importers: [
      {
        id: joinDepIDTuple(['file', '.']),
        name: rootDepID,
        location: '.',
        importer: true,
        manifest: {
          dependencies: { abbrev: '*' },
        },
        dev: false,
        optional: false,
        confused: false,
      },
    ],
    lockfile: {
      lockfileVersion: 0,
      options: {},
      nodes: {
        [abbrevDepID]: [
          0,
          'abbrev',
          null,
          null,
          `./node_modules/.vlt/${abbrevDepID}`,
          {
            name: 'abbrev',
            version: '1.2.3',
          },
        ],
      },
      edges: {
        [`${rootDepID} abbrev`]: `prod * ${abbrevDepID}`,
        [`${abbrevDepID} abbrev`]: `prod * ${abbrevDepID}`,
      },
    },
    projectInfo: {
      tools: ['vlt'],
      vltInstalled: true,
    },
    securityArchive: {
      [abbrevDepID]: {
        id: '99923218962',
        author: ['npm'],
        size: 13003,
        type: 'npm',
        name: 'abbrev',
        version: '1.2.3',
        alerts: [],
      },
      ok: true,
    },
  })
})

t.test('graph data for depless vlt project', async t => {
  const dir = t.testdir({
    tmp: {
      'graph.json': JSON.stringify({
        just: { some: { prexisting: 'junk' } },
      }),
    },
    project: {
      'vlt.json': JSON.stringify({
        color: true,
      }),
      'package.json': JSON.stringify({}),
      node_modules: {
        '.vlt-lock.json': JSON.stringify({}),
      },
    },
  })
  const projectRoot = resolve(dir, 'project')
  const tmp = resolve(dir, 'tmp')
  await updateGraphData(
    {
      projectRoot,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
    },
    tmp,
    true,
  )
  const result = JSON.parse(
    readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
  )
  t.match(result, {
    hasDashboard: true,
    importers: [
      {
        id: joinDepIDTuple(['file', '.']),
        name: joinDepIDTuple(['file', '.']),
        location: '.',
        importer: true,
        manifest: {},
        dev: false,
        optional: false,
        confused: false,
      },
    ],
    lockfile: {
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    },
    projectInfo: {
      tools: ['vlt'],
      vltInstalled: true,
    },
    securityArchive: { ok: false },
  })
})

t.test('graph data for missing project', async t => {
  const dir = t.testdir({
    tmp: {
      'graph.json': JSON.stringify({
        just: { some: { prexisting: 'junk' } },
      }),
    },
  })
  const projectRoot = resolve(dir, 'project')
  const tmp = resolve(dir, 'tmp')
  await updateGraphData(
    {
      projectRoot,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
    },
    tmp,
    false,
  )
  const result = JSON.parse(
    readFileSync(resolve(tmp, 'graph.json'), 'utf8'),
  )
  t.strictSame(result, {
    hasDashboard: false,
    importers: [],
    lockfile: {},
    projectInfo: {
      tools: [],
      vltInstalled: false,
    },
  })
})

t.test(
  'loadGraph passes manifest and flags to actual.load',
  async t => {
    const projectRoot = t.testdir({})
    const manifest = { name: 'proj' }
    let called = false

    const { loadGraph } = await t.mockImport<
      typeof import('../src/graph-data.ts')
    >('../src/graph-data.ts', {
      '@vltpkg/graph': {
        actual: {
          load: (opts: any) => {
            called = true
            t.equal(opts.projectRoot, projectRoot)
            t.same(opts.mainManifest, manifest)
            t.equal(opts.loadManifests, true)
            t.equal(opts.skipHiddenLockfile, false)
            t.equal(opts.skipLoadingNodesOnModifiersChange, false)
            return { ok: true }
          },
        },
      },
    })

    const result = loadGraph({
      projectRoot,
      // minimal packageJson impl needed by loadGraph
      packageJson: {
        read: (root: string) => {
          t.equal(root, projectRoot)
          return manifest as any
        },
      },
    } as any)

    t.ok(called)
    t.strictSame(result, { ok: true })
  },
)
