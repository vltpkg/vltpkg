import t from 'tap'
import { loadNodes } from '../../src/lockfile/load-nodes.ts'
import { Graph } from '../../src/graph.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { type LockfileData } from '../../src/index.ts'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

t.test('load nodes', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      0,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    ],
    [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
      0,
      'bar',
      'sha512-6/deadbeef==',
      'https://registry.example.com/bar/-/bar-1.0.0.tgz',
    ],
    [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
      0,
      'baz',
      null,
      null,
      './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes)
  t.matchSnapshot(
    [...graph.nodes.values()].map(n => n.toJSON()),
    'should load nodes into graph',
  )

  const moreNodes = {
    [joinDepIDTuple(['registry', '', 'lorem'])]: [
      0,
      null,
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    ],
  } as LockfileData['nodes']
  loadNodes(graph, moreNodes)
  const namelessNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'lorem']),
  )!
  t.matchSnapshot(
    namelessNode.toJSON(),
    'should load node missing name and version',
  )
})

t.test('load nodes with manifest', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
      3,
      'bar',
      null,
      null,
      null,
      {
        name: 'bar',
        version: '1.0.0',
      },
    ],
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      2,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      null,
      'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    ],
    [joinDepIDTuple(['registry', 'custom', 'baz@1.0.0'])]: [
      1,
      'baz',
      null,
      'http://example.com/baz.tgz',
      null,
      {
        name: 'baz',
        version: '1.0.0',
        dist: {
          tarball: 'http://example.com/baz.tgz',
        },
      },
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes)
  t.matchSnapshot(
    [...graph.nodes.values()].map(n => n.toJSON()),
    'should load nodes into graph with manifest data',
  )
})
