import { Spec, kCustomInspect } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.ts'
import { Node } from '../src/node.ts'
import type { GraphLike } from '@vltpkg/types'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)projectRoot: .*$/gm, '$1projectRoot: #')

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('Edge', async t => {
  const opts = {
    ...configData,
    projectRoot: t.testdirName,
    graph: {} as GraphLike,
  }
  const rootMani = {
    name: 'root',
    version: '1.0.0',
  }
  const rootSpec = Spec.parse('root@1.0.0')
  const root = new Node(opts, undefined, rootMani, rootSpec)
  const childMani = {
    name: 'child',
    version: '1.0.0',
  }
  const childSpec = Spec.parse('child@1.0.0')
  const child = new Node(opts, undefined, childMani, childSpec)

  const edge = new Edge(
    'prod',
    Spec.parse('child@^1.0.0'),
    root,
    child,
  )
  t.ok(edge.valid(), 'valid edge')
  t.equal(edge.name, 'child')
  t.equal(edge.dev, false)
  t.equal(edge.optional, false)
  t.matchSnapshot(inspect(edge, { depth: 0 }))
  const dangling = new Edge(
    'prod',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.notOk(dangling.valid(), 'invalid edge')
  t.matchSnapshot(inspect(dangling, { depth: 1 }))
  const optional = new Edge(
    'optional',
    Spec.parse('missing', 'latest'),
    child,
  )
  t.equal(optional.optional, true)

  const pdmMani = {
    name: 'pdm',
    version: '1.2.3',
    peerDependencies: { foo: '*' },
    peerDependenciesMeta: { foo: { optional: true } },
  }
  const pdmSpec = Spec.parse('pdm@1.2.3')
  const pdm = new Node(opts, undefined, pdmMani, pdmSpec)
  const pdmEdge = new Edge('peerOptional', Spec.parse('foo@*'), pdm)
  t.equal(pdmEdge.peer, true)
  t.equal(pdmEdge.peerOptional, true)

  // Test toJSON() method
  t.test('toJSON', t => {
    const edgeWithTo = new Edge(
      'prod',
      Spec.parse('child@^1.0.0'),
      root,
      child,
    )
    const edgeJSON = edgeWithTo.toJSON()
    t.match(edgeJSON, {
      from: root.id,
      to: child.id,
      type: 'prod',
      spec: 'child@^1.0.0',
    })
    t.type(edgeJSON.from, 'string')
    t.type(edgeJSON.to, 'string')
    t.type(edgeJSON.type, 'string')
    t.type(edgeJSON.spec, 'string')

    // Test dangling edge (no to node)
    const danglingEdgeJSON = dangling.toJSON()
    t.match(danglingEdgeJSON, {
      from: child.id,
      to: undefined,
      type: 'prod',
      spec: 'missing@latest',
    })
    t.type(danglingEdgeJSON.from, 'string')
    t.equal(danglingEdgeJSON.to, undefined)

    // Test different dependency types
    const devEdge = new Edge(
      'dev',
      Spec.parse('dev-dep@1.0.0'),
      root,
      child,
    )
    const devJSON = devEdge.toJSON()
    t.equal(devJSON.type, 'dev')

    const optionalJSON = optional.toJSON()
    t.equal(optionalJSON.type, 'optional')

    const peerOptionalJSON = pdmEdge.toJSON()
    t.equal(peerOptionalJSON.type, 'peerOptional')

    t.end()
  })

  t.test('toString', t => {
    const edge = new Edge(
      'prod',
      Spec.parse('foo@^1.0.0'),
      root,
      child,
    )
    const edgeStr = edge.toString()
    t.equal(edgeStr, `Edge from: ${root.id} --|prod|--> foo`)

    const danglingEdge = new Edge(
      'prod',
      Spec.parse('bar', 'latest'),
      child,
    )
    const danglingStr = danglingEdge.toString()
    t.equal(
      danglingStr,
      `Edge from: ${child.id} --|prod|--> bar (missing)`,
    )

    t.end()
  })
})
