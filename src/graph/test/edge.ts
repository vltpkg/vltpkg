import { inspect } from 'node:util'
import t from 'tap'
import { Node } from '../src/node.js'
import { Edge } from '../src/edge.js'

t.test('Edge', async t => {
  const root = new Node(0, { name: 'root', version: '1.0.0' })
  const child = new Node(1, { name: 'child', version: '1.0.0' })
  const edge = new Edge(
    'dependencies',
    'child',
    '^1.0.0',
    root,
    child,
  )
  t.matchSnapshot(inspect(edge, { depth: 0 }))
  const dangling = new Edge(
    'dependencies',
    'missing',
    'latest',
    child,
  )
  t.matchSnapshot(inspect(dangling, { depth: 1 }))
})
