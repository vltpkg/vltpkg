import { Spec } from '@vltpkg/spec'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.js'
import { Node } from '../src/node.js'
import { Package } from '../src/pkgs.js'

t.test('Edge', async t => {
  const root = new Node(0, {
    name: 'root',
    version: '1.0.0',
  } as Package)
  const child = new Node(1, {
    name: 'child',
    version: '1.0.0',
  } as Package)

  const edge = new Edge(
    'dependencies',
    Spec.parse('child@^1.0.0'),
    root,
    child,
  )
  t.equal(edge.name, 'child')
  t.equal(edge.dev, false)
  t.equal(edge.optional, false)
  t.matchSnapshot(inspect(edge, { depth: 0 }))
  const validDistTag = new Edge(
    'devDependencies',
    Spec.parse('child', 'latest'),
    root,
    child,
  )
  t.equal(validDistTag.dev, true)
  new Edge(
    'dependencies',
    Spec.parse('child', '^9.0.0'),
    root,
    child,
  )
  const dangling = new Edge(
    'dependencies',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.matchSnapshot(inspect(dangling, { depth: 1 }))
  const optional = new Edge(
    'optionalDependencies',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.equal(optional.optional, true)

  const pdm = new Node(2, {
    name: 'pdm',
    version: '1.2.3',
    peerDependencies: { foo: '*' },
    peerDependenciesMeta: { foo: { optional: true } },
  } as unknown as Package)
  const pdmEdge = new Edge(
    'peerDependencies',
    Spec.parse('foo@*'),
    pdm,
  )
  t.equal(pdmEdge.peerOptional, true)
})
