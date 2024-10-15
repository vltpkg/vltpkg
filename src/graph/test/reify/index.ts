import { DepID, joinDepIDTuple } from '@vltpkg/dep-id'
import {
  PackageInfoClient,
  PackageInfoClientRequestOptions,
  Resolution,
} from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import {
  lstatSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { inspect } from 'util'
import {
  actual,
  ideal,
  LockfileData,
  LockfileEdges,
  LockfileNode,
  reify,
} from '../../src/index.js'
import {
  fixtureManifest,
  mockPackageInfo,
} from '../fixtures/reify.js'

t.test('super basic reification', async t => {
  const dir = t.testdir({
    cache: {},
    project: {
      'vlt.json': JSON.stringify({
        cache: resolve(t.testdirName, 'cache'),
      }),
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.0.0',
        dependencies: {
          lodash: '4',
        },
      }),
    },
  })
  const projectRoot = resolve(dir, 'project')
  const graph = await ideal.build({
    projectRoot,
    packageInfo: mockPackageInfo,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    graph,
  })

  t.strictSame(
    new Set(readdirSync(projectRoot + '/node_modules')),
    new Set(['.vlt', '.vlt-lock.json', 'lodash']),
  )

  t.strictSame(
    lstatSync(
      resolve(projectRoot, 'node_modules/lodash'),
    ).isSymbolicLink(),
    true,
  )

  const expectLockfileData: LockfileData = {
    options: {},
    nodes: {
      [joinDepIDTuple(['registry', '', 'lodash@4.17.21'])]: [
        0,
        'lodash',
        'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [`${joinDepIDTuple(['file', '.'])} lodash`]:
        'prod 4 ' +
        joinDepIDTuple(['registry', '', 'lodash@4.17.21']),
    } as LockfileEdges,
  }
  t.strictSame(
    JSON.parse(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), 'utf8'),
    ),
    expectLockfileData,
  )

  const ldPath = resolve(projectRoot, 'node_modules/lodash/index.js')
  t.strictSame(statSync(ldPath).isFile(), true)
  const ld = await import(String(pathToFileURL(ldPath)))
  t.equal(ld.default.VERSION, '4.17.21', 'got the expected lodash')

  // decide we want underscore instead, sorry jdd

  graph.mainImporter.manifest = {
    name: 'x',
    version: '1.0.0',
    dependencies: {
      underscore: '1',
    },
  }
  graph.mainImporter.edgesOut.delete('lodash')
  graph.removeNode(
    graph.nodes.get(
      joinDepIDTuple(['registry', '', 'lodash@4.17.21']),
    )!,
  )
  graph.addNode(
    joinDepIDTuple(['registry', '', 'underscore@1.13.7']),
    fixtureManifest('underscore-1.13.7'),
    Spec.parse('underscore@1'),
    'underscore',
    '1.13.7',
  )
  graph.addEdge(
    'prod',
    Spec.parse('underscore@1'),
    graph.mainImporter,
    graph.nodes.get(
      joinDepIDTuple(['registry', '', 'underscore@1.13.7']),
    ),
  )
  writeFileSync(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(graph.mainImporter.manifest),
  )

  // verify that it works if there's contents in node_modules,
  // but no lockfile present.
  unlinkSync(resolve(projectRoot, 'vlt-lock.json'))

  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    graph,
  })

  t.throws(() => statSync(ldPath))
  const usPath = resolve(
    projectRoot,
    'node_modules/underscore/underscore.js',
  )
  const us = await import(String(pathToFileURL(usPath)))
  t.equal(us.default.VERSION, '1.13.7')
})

t.test('reify with a bin', async t => {
  const dir = t.testdir({
    cache: {},
    project: {
      'vlt.json': JSON.stringify({
        cache: resolve(t.testdirName, 'cache'),
      }),
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.0.0',
        dependencies: {
          glob: '11',
        },
      }),
    },
  })

  const projectRoot = resolve(dir, 'project')
  const graph = await ideal.build({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
  })
  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    graph,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  t.equal(
    // note: not lstat, since this is going to be a shim on windows,
    // but a symlink on posix
    statSync(resolve(projectRoot, 'node_modules/.bin/glob')).isFile(),
    true,
    'bin was created',
  )
})

t.test('failure rolls back', async t => {
  const dir = t.testdir({
    cache: {},
    project: {
      'vlt.json': JSON.stringify({
        cache: resolve(t.testdirName, 'cache'),
      }),
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.0.0',
        dependencies: {
          glob: '11',
        },
      }),
    },
  })

  const projectRoot = resolve(dir, 'project')

  const before = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const graph = await ideal.build({
    projectRoot,
    packageInfo: mockPackageInfo,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const { reify } = await t.mockImport('../../src/reify/index.js', {
    '../../src/reify/build.js': {
      build: () =>
        Promise.reject(new Error('expected failure, roll back')),
    },
  })

  await t.rejects(
    reify({
      projectRoot,
      packageInfo: mockPackageInfo,
      graph,
    }),
  )

  const after = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })

  t.strictSame(before, after, 'no changes to actual graph')

  t.throws(
    // note: not lstat, since this is going to be a shim on windows,
    // but a symlink on posix
    () => statSync(resolve(projectRoot, 'node_modules/.bin/glob')),
  )
})

t.test('failure of optional node just deletes it', async t => {
  const dir = t.testdir({
    cache: {},
    project: {
      'vlt.json': JSON.stringify({
        cache: resolve(t.testdirName, 'cache'),
      }),
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.0.0',
        optionalDependencies: {
          glob: '11',
        },
      }),
    },
  })

  const projectRoot = resolve(dir, 'project')

  const before = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const graph = await ideal.build({
    projectRoot,
    packageInfo: mockPackageInfo,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })
  const globEdge = graph.mainImporter.edgesOut.get('glob')
  t.ok(globEdge, 'main importer depends on glob')
  t.equal(
    globEdge?.to?.edgesIn.has(globEdge),
    true,
    'glob has same edgeIn from main',
  )

  await reify({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    packageInfo: {
      ...mockPackageInfo,
      async extract(
        spec: Spec | string,
        target: string,
        options: PackageInfoClientRequestOptions = {},
      ): Promise<Resolution> {
        const s = Spec.parse(String(spec))
        if (s.name === 'path-scurry') {
          throw new Error('no path scurry for you!')
        }
        return mockPackageInfo.extract(spec, target, options)
      },
    } as unknown as PackageInfoClient,
    graph,
  })

  const after = actual.load({
    projectRoot,
    monorepo: Monorepo.maybeLoad(projectRoot),
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
  })

  t.strictSame(
    inspect(before),
    inspect(after),
    'ultimately no changes to actual graph',
  )

  t.throws(
    // note: not lstat, since this is going to be a shim on windows,
    // but a symlink on posix
    () => statSync(resolve(projectRoot, 'node_modules/.bin/glob')),
  )
})
