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
          [joinDepIDTuple(['registry', '', 'abbrev'])]: {
            id: '99923218962',
            author: ['npm'],
            size: 13003,
            type: 'npm',
            name: 'abbrev',
            version: '1.0.0',
            alerts: [],
          },
          ok: true,
        }),
      },
    },
  })

  const abbrevDepID = joinDepIDTuple(['registry', '', 'abbrev'])
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
  t.strictSame(result, {
    hasDashboard: true,
    importers: [
      {
        id: 'file·.',
        name: 'file·.',
        location: '.',
        importer: true,
        manifest: {
          dependencies: { abbrev: '*' },
        },
        projectRoot,
        dev: false,
        optional: false,
      },
    ],
    lockfile: {
      options: {},
      nodes: {
        '··abbrev@1.2.3': [
          0,
          'abbrev',
          null,
          null,
          './node_modules/.vlt/··abbrev',
          {
            name: 'abbrev',
            version: '1.2.3',
          },
        ],
      },
      edges: {
        'file·. abbrev': 'prod * ··abbrev@1.2.3',
        '··abbrev@1.2.3 abbrev': 'prod * ··abbrev@1.2.3',
      },
    },
    projectInfo: { tools: ['vlt'], vltInstalled: true },
    securityArchive: {
      [joinDepIDTuple(['registry', '', 'abbrev'])]: {
        id: '99923218962',
        author: ['npm'],
        size: 13003,
        type: 'npm',
        name: 'abbrev',
        version: '1.0.0',
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
  t.strictSame(result, {
    hasDashboard: true,
    importers: [
      {
        id: 'file·.',
        name: 'file·.',
        location: '.',
        importer: true,
        manifest: {},
        projectRoot,
        dev: false,
        optional: false,
      },
    ],
    lockfile: {
      options: {},
      nodes: {},
      edges: {},
    },
    projectInfo: { tools: ['vlt'], vltInstalled: true },
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
