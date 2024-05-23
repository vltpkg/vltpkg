import { inspect } from 'node:util'
import t from 'tap'
import { Spec } from '@vltpkg/spec'
import { Edge } from '../src/edge.js'
import { Node } from '../src/node.js'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

t.test('Edge', async t => {
  const rootMani = {
    name: 'root',
    version: '1.0.0',
  }
  const rootSpec = Spec.parse('root@1.0.0')
  const root = new Node(rootMani, undefined, rootSpec)
  const childMani = {
    name: 'child',
    version: '1.0.0',
  }
  const childSpec = Spec.parse('child@1.0.0')
  const child = new Node(childMani, undefined, childSpec)

  const edge = new Edge(
    'dependencies',
    Spec.parse('child@^1.0.0'),
    root,
    child,
  )
  t.equal(edge.valid, true)
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
  t.equal(validDistTag.valid, true)
  const invalid = new Edge(
    'dependencies',
    Spec.parse('child', '^9.0.0'),
    root,
    child,
  )
  t.equal(invalid.valid, false)
  const dangling = new Edge(
    'dependencies',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.equal(dangling.valid, false)
  t.matchSnapshot(inspect(dangling, { depth: 1 }))
  const optional = new Edge(
    'optionalDependencies',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.equal(optional.optional, true)
  t.equal(optional.valid, true)

  const pdmMani = {
    name: 'pdm',
    version: '1.2.3',
    peerDependencies: { foo: '*' },
    peerDependenciesMeta: { foo: { optional: true } },
  }
  const pdmSpec = Spec.parse('pdm@1.2.3')
  const pdm = new Node(pdmMani, undefined, pdmSpec)
  const pdmEdge = new Edge(
    'peerDependencies',
    Spec.parse('foo@*'),
    pdm,
  )
  t.equal(pdmEdge.peerOptional, true)
  t.equal(pdmEdge.valid, true, 'optional is valid even if missing')
})
