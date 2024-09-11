import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { statSync } from 'fs'
import { rm } from 'fs/promises'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Edge } from '../../src/edge.js'
import { Node } from '../../src/node.js'
import { addEdge } from '../../src/reify/add-edge.js'

const mockRemover = {
  rm: (path: string) => rm(path, { recursive: true, force: true }),
  confirm() {},
  rollback() {},
} as unknown as RollbackRemove

const fooManifest = {
  name: 'foo',
  version: '1.2.3',
  dependencies: { bar: '' },
}

const barManifest = {
  name: 'bar',
  version: '1.2.3',
  bin: './bar.js',
}

t.test('reify an edge', async t => {
  const projectRoot = t.testdir({
    node_modules: {
      '.vlt': {
        ';;foo@1.2.3': {
          node_modules: {
            foo: {
              'package.json': JSON.stringify(fooManifest),
            },
          },
        },
        ';;bar@1.2.3': {
          node_modules: {
            bar: {
              'package.json': JSON.stringify(barManifest),
              'bar.js': '#!/usr/local/bin node\nconsole.log("bar")',
            },
          },
        },
      },
    },
  })

  const fooNM =
    projectRoot + '/node_modules/.vlt/;;foo@1.2.3/node_modules'

  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar'))
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))
  const fooNode = new Node(
    { projectRoot, importers: new Set() },
    ';;foo@1.2.3',
    fooManifest,
  )
  fooNode.location =
    projectRoot + '/node_modules/.vlt/;;foo@1.2.3/node_modules/foo'
  const barNode = new Node(
    { projectRoot, importers: new Set() },
    ';;bar@1.2.3',
    barManifest,
  )
  barNode.location =
    projectRoot + '/node_modules/.vlt/;;bar@1.2.3/node_modules/bar'
  const rootNode = new Node(
    { projectRoot, importers: new Set() },
    'file;.',
    {},
  )
  rootNode.location = projectRoot

  const edge = new Edge('prod', Spec.parse('bar@'), fooNode, barNode)
  const scurry = new PathScurry(projectRoot)

  await addEdge(edge, barManifest, scurry, mockRemover)

  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar'))
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')

  const rootEdge = new Edge(
    'prod',
    Spec.parse('bar@'),
    rootNode,
    barNode,
  )
  await addEdge(rootEdge, barManifest, scurry, mockRemover)
  statSync(projectRoot + '/node_modules/bar')
  statSync(projectRoot + '/node_modules/.bin/bar')

  const dangle = new Edge(
    'optional',
    Spec.parse('asdf@'),
    rootNode,
    undefined,
  )
  // just verify it doesn't blow up
  await addEdge(dangle, {}, scurry, mockRemover)

  // exercise the clobbering case
  await addEdge(rootEdge, barManifest, scurry, mockRemover)
  statSync(projectRoot + '/node_modules/bar')
  statSync(projectRoot + '/node_modules/.bin/bar')
})
