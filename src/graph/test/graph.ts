import { inspect } from 'node:util'
import t from 'tap'
import { Graph } from '../src/graph.js'

t.test('Graph', async t => {
  const rootPackageJson = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph(rootPackageJson)
  t.strictSame(
    graph.root.pkg.name,
    'my-project',
    'should have created a root folder with expected properties',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 0 }),
    'should print with special tag name',
  )
  const newNode = graph.newNode({
    name: 'foo',
    version: '1.0.0',
  })
  t.strictSame(
    graph.nodes.size,
    2,
    'should create and add the new node to the graph',
  )
  graph.newEdge('prod', 'foo', '^1.0.0', graph.root, newNode)
  t.strictSame(
    graph.root.edgesOut.size,
    1,
    'should add edge to the list of edgesOut in its origin node',
  )
  graph.newEdge('prod', 'foo', '^1.0.0', graph.root, newNode)
  t.strictSame(
    graph.root.edgesOut.size,
    1,
    'should not allow for adding new edges between same nodes',
  )
  graph.newEdge('prod', 'missing', '*', graph.root)
  t.strictSame(
    graph.missingDependencies.size,
    1,
    'should add edge to list of missing dependencies',
  )
})
