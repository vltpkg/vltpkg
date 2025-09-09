import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { statSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Edge } from '../../src/edge.ts'
import { Node } from '../../src/node.ts'
import { addEdge } from '../../src/reify/add-edge.ts'
import type { GraphLike } from '@vltpkg/types'

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
        [joinDepIDTuple(['registry', '', 'foo@1.2.3'])]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify(fooManifest),
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'bar@1.2.3'])]: {
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
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules'

  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar'))
  t.throws(() => statSync(fooNM + '/bar'))
  t.throws(() => statSync(fooNM + '/.bin/bar'))

  const opts = {
    projectRoot,
    graph: {} as GraphLike,
  }

  const fooNode = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    fooManifest,
  )

  fooNode.location =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules/foo'

  const barNode = new Node(
    opts,
    joinDepIDTuple(['registry', '', 'bar@1.2.3']),
    barManifest,
  )

  barNode.location =
    projectRoot +
    '/node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'bar@1.2.3']) +
    '/node_modules/bar'
  const rootNode = new Node(opts, joinDepIDTuple(['file', '.']), {})
  rootNode.location = projectRoot

  const edge = new Edge('prod', Spec.parse('bar@'), fooNode, barNode)
  const scurry = new PathScurry(projectRoot)

  t.intercept(process, 'platform', { value: 'win32' })
  await addEdge(edge, barManifest, scurry, mockRemover)

  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar'))
  statSync(fooNM + '/bar')
  statSync(fooNM + '/.bin/bar')
  statSync(fooNM + '/.bin/bar.cmd')
  statSync(fooNM + '/.bin/bar.ps1')

  const rootEdge = new Edge(
    'prod',
    Spec.parse('bar@'),
    rootNode,
    barNode,
  )

  t.intercept(process, 'platform', { value: 'darwin' })
  await addEdge(rootEdge, barManifest, scurry, mockRemover)
  statSync(projectRoot + '/node_modules/bar')
  statSync(projectRoot + '/node_modules/.bin/bar')
  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar.cmd'))
  t.throws(() => statSync(projectRoot + '/node_modules/.bin/bar.ps1'))

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
