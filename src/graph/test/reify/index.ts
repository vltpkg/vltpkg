import { Spec } from '@vltpkg/spec'
import { pathToFileURL } from 'node:url'
import {
  lstatSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { statSync } from 'node:fs'
import { resolve } from 'path'
import t from 'tap'
import { actual, ideal, reify } from '../../src/index.js'
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
  const graph = await ideal.build({ projectRoot })
  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    graph,
  })

  t.strictSame(
    new Set(readdirSync(projectRoot + '/node_modules')),
    new Set(['.vlt', 'lodash']),
  )

  t.strictSame(
    lstatSync(
      resolve(projectRoot, 'node_modules/lodash'),
    ).isSymbolicLink(),
    true,
  )

  t.strictSame(
    JSON.parse(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), 'utf8'),
    ),
    {
      registries: {},
      nodes: {
        'file;.': ['x'],
        ';;lodash@4.17.21': [
          'lodash',
          'sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==',
        ],
      },
      edges: [['file;.', 'prod', 'lodash@4', ';;lodash@4.17.21']],
    },
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
  graph.removeNode(graph.nodes.get(';;lodash@4.17.21')!)
  graph.addNode(
    ';;underscore@1.13.7',
    fixtureManifest('underscore-1.13.7'),
    Spec.parse('underscore@1'),
    'underscore',
    '1.13.7',
  )
  graph.addEdge(
    'prod',
    Spec.parse('underscore@1'),
    graph.mainImporter,
    graph.nodes.get(';;underscore@1.13.7')!,
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
  const graph = await ideal.build({ projectRoot })
  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    graph,
  })
  t.equal(
    // note: not lstat, since this is going to be a shim on windows,
    // but a symlink on posix
    statSync(resolve(projectRoot, 'node_modules/.bin/glob')).isFile(),
    true,
    'bin was created',
  )
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
  const graph = await ideal.build({ projectRoot })
  await reify({
    projectRoot,
    packageInfo: mockPackageInfo,
    graph,
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

  const before = actual.load({ projectRoot })
  const graph = await ideal.build({ projectRoot })
  const { reify } = await t.mockImport('../../src/reify/index.js', {
    '../../src/reify/chmod-bins.js': {
      chmodBins: () => [
        Promise.reject(
          new Error('expected failure, time to roll back'),
        ),
      ],
    },
  })

  await t.rejects(
    reify({
      projectRoot,
      packageInfo: mockPackageInfo,
      graph,
    }),
  )

  const after = actual.load({ projectRoot })

  t.strictSame(before, after, 'no changes to actual graph')

  t.throws(
    // note: not lstat, since this is going to be a shim on windows,
    // but a symlink on posix
    () => statSync(resolve(projectRoot, 'node_modules/.bin/glob')),
  )
})
