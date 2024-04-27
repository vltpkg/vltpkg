import { inspect } from 'node:util'
import t from 'tap'
import { Node } from '../src/node.js'
import { Edge } from '../src/edge.js'

t.test('Node', async t => {
  const root = new Node(0, { name: 'root', version: '1.0.0' })
  root.isRoot = true
  t.strictSame(
    root.edgesIn.size,
    0,
    'should have an empty list of edgesIn',
  )
  t.strictSame(
    root.edgesOut.size,
    0,
    'should have an empty list of edgesOut',
  )
  t.matchSnapshot(
    inspect(root, { depth: 0 }),
    'should print with special tag name',
  )

  const foo = new Node(1, { name: 'foo', version: '1.0.0' })
  const bar = new Node(2, { name: 'bar', version: '1.0.0' })

  root.addEdgeOut('dependencies', 'foo', '^1.0.0', foo)
  foo.addEdgeIn('dependencies', 'root', '^1.0.0', root)
  root.addEdgeOut('dependencies', 'bar', '^1.0.0', bar)
  bar.addEdgeIn('dependencies', 'root', '^1.0.0', root)

  t.strictSame(
    root.edgesOut.size,
    2,
    'should have a list of edgesOut',
  )
  t.strictSame(foo.edgesIn.size, 1, 'should have an edge')
  t.strictSame(
    [root.edgesOut.get('foo').to, root.edgesOut.get('bar').to],
    [foo, bar],
    'should have edges out properly set up',
  )
  t.strictSame(
    [...foo.edgesIn][0].to,
    root,
    'should have edges in to root',
  )
  t.strictSame(
    [...bar.edgesIn][0].to,
    root,
    'should have edges in to root',
  )
})
