import t from 'tap'
import { loadNodes } from '../../src/lockfile/load-nodes.ts'
import { Graph } from '../../src/graph.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { LockfileData } from '../../src/index.ts'

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

t.test('load nodes with confused manifest', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      0,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      null,
      'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
      {
        name: 'foo',
        version: '1.0.0',
      },
      {
        name: 'test',
        version: '1.0.0',
      },
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes)
  const loadedFoo = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
  )
  t.ok(loadedFoo, 'should load the confused node')
  t.equal(loadedFoo?.confused, true, 'should have confused flag set')
  t.equal(
    loadedFoo?.manifest?.name,
    'foo',
    'should have fixed manifest name',
  )
  t.equal(
    loadedFoo?.rawManifest?.name,
    'test',
    'should have original manifest name',
  )
  t.matchSnapshot(
    loadedFoo?.toJSON(),
    'should load node with confused manifest',
  )
})

t.test(
  'load nodes with modifier from extra DepID parameter',
  async t => {
    const graph = new Graph({
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: t.testdirName,
    })

    // Create DepIDs with extra parameters for different dependency types
    const nodes = {
      // Registry dependency with extra parameter (modifier)
      [joinDepIDTuple([
        'registry',
        '',
        'modified-pkg@1.0.0',
        ':root > #modified-pkg',
      ])]: [
        0,
        'modified-pkg',
        'sha512-example==',
        'https://registry.npmjs.org/modified-pkg/-/modified-pkg-1.0.0.tgz',
        null,
        {
          name: 'modified-pkg',
          version: '1.0.0',
        },
      ],
      // Git dependency with extra parameter (modifier)
      [joinDepIDTuple([
        'git',
        'https://github.com/user/repo.git',
        'main',
        ':root > #git-pkg',
      ])]: [
        0,
        'git-pkg',
        null,
        null,
        null,
        {
          name: 'git-pkg',
          version: '1.0.0',
        },
      ],
      // File dependency with extra parameter (modifier)
      [joinDepIDTuple(['file', './local-pkg', ':root > #file-pkg'])]:
        [
          0,
          'file-pkg',
          null,
          null,
          './packages/local-pkg',
          {
            name: 'file-pkg',
            version: '1.0.0',
          },
        ],
      // Registry dependency without extra parameter (no modifier)
      [joinDepIDTuple(['registry', '', 'regular-pkg@1.0.0'])]: [
        0,
        'regular-pkg',
        'sha512-example==',
        null,
        null,
        {
          name: 'regular-pkg',
          version: '1.0.0',
        },
      ],
    } as LockfileData['nodes']

    loadNodes(graph, nodes)

    // Verify registry node with modifier
    const modifiedPkgNode = graph.nodes.get(
      joinDepIDTuple([
        'registry',
        '',
        'modified-pkg@1.0.0',
        ':root > #modified-pkg',
      ]),
    )
    t.ok(
      modifiedPkgNode,
      'should load modified registry package node',
    )
    t.equal(
      modifiedPkgNode?.modifier,
      ':root > #modified-pkg',
      'registry node should have correct modifier',
    )

    // Verify git node with modifier
    const gitPkgNode = graph.nodes.get(
      joinDepIDTuple([
        'git',
        'https://github.com/user/repo.git',
        'main',
        ':root > #git-pkg',
      ]),
    )
    t.ok(gitPkgNode, 'should load modified git package node')
    t.equal(
      gitPkgNode?.modifier,
      ':root > #git-pkg',
      'git node should have correct modifier',
    )

    // Verify file node with modifier
    const filePkgNode = graph.nodes.get(
      joinDepIDTuple(['file', './local-pkg', ':root > #file-pkg']),
    )
    t.ok(filePkgNode, 'should load modified file package node')
    t.equal(
      filePkgNode?.modifier,
      ':root > #file-pkg',
      'file node should have correct modifier',
    )

    // Verify regular node without modifier
    const regularPkgNode = graph.nodes.get(
      joinDepIDTuple(['registry', '', 'regular-pkg@1.0.0']),
    )
    t.ok(regularPkgNode, 'should load regular package node')
    t.equal(
      regularPkgNode?.modifier,
      undefined,
      'regular node should have no modifier',
    )

    // Verify that all nodes with modifiers have them set correctly
    const nodesWithModifiers = [...graph.nodes.values()].filter(
      node => node.modifier !== undefined,
    )
    t.equal(
      nodesWithModifiers.length,
      3,
      'should have 4 nodes with modifiers',
    )

    // Snapshot test to verify the complete structure
    t.matchSnapshot(
      [...graph.nodes.values()]
        .filter(node => node.name !== 'my-project') // Exclude main importer
        .map(n => ({
          id: n.id,
          name: n.name,
          modifier: n.modifier,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      'should load nodes with correct modifiers from extra DepID parameters',
    )
  },
)
