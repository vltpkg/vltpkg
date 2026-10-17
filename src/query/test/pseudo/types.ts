import t from 'tap'
import { Spec } from '@vltpkg/spec'
import { Query } from '../../src/index.ts'
import { newGraph, newNode } from '../fixtures/graph.ts'
import type { NodeLike, EdgeLike } from '@vltpkg/types'
import { getTypeTarget } from '@vltpkg/types'

t.test('type associations through Query.search', async t => {
  const graph = newGraph('project')
  const add = (
    name: string,
    version = '1.0.0',
    typeTarget?: string,
    from = graph.mainImporter,
  ) => {
    const node = newNode(graph)(name, version)
    node.typeTarget = typeTarget ?? getTypeTarget(name)
    graph.nodes.set(node.id, node)
    const edge: EdgeLike = {
      name,
      from,
      to: node,
      type: 'dev',
      spec: Spec.parse(name, version),
    }
    from.edgesOut.set(name, edge)
    graph.edges.add(edge)
    node.edgesIn.add(edge)
    return node
  }
  add('react')
  add('react', '2.0.0', undefined, add('consumer'))
  add('@types/react')
  add('@scope/name')
  add('@types/scope__name')
  add('@types/removed')
  add('custom-definitions', '1.0.0', 'custom')
  add('custom')
  add('untyped')
  const nameless = add('nameless')
  nameless.name = undefined

  const search = async (selector: string) => {
    const query = new Query({
      nodes: new Set(graph.nodes.values()),
      edges: graph.edges,
      importers: graph.importers,
      securityArchive: undefined,
    })
    return query.search(selector, {
      signal: new AbortController().signal,
    })
  }
  const names = (nodes: NodeLike[]) => nodes.map(n => n.name).sort()
  const cases: [string, string[]][] = [
    [':types', ['@scope/name', 'custom', 'react', 'react']],
    [
      ':type',
      [
        '@types/react',
        '@types/removed',
        '@types/scope__name',
        'custom-definitions',
      ],
    ],
    ['#react:types', ['react', 'react']],
    [':types#react', ['react', 'react']],
    [':type(orphan)', ['@types/removed']],
  ]
  for (const [selector, expected] of cases) {
    const result = await search(selector)
    t.same(names(result.nodes), expected.sort(), selector)
    t.same(
      result.edges.map(e => e.name).sort(),
      expected.sort(),
      `${selector} edges`,
    )
  }
  const excluded = await search(':not(:type)')
  t.same(
    names(excluded.nodes),
    [
      '@scope/name',
      'project',
      'consumer',
      'react',
      'react',
      'custom',
      'untyped',
      undefined,
    ].sort(),
  )

  const react = [...graph.nodes.values()].filter(
    n => n.name === 'react',
  )
  for (const node of react) {
    graph.nodes.delete(node.id)
    for (const edge of node.edgesIn) {
      graph.edges.delete(edge)
      edge.from.edgesOut.delete(edge.name)
    }
  }
  t.same(names((await search(':type(orphan)')).nodes), [
    '@types/react',
    '@types/removed',
  ])
  t.same(names((await search(':types')).nodes), [
    '@scope/name',
    'custom',
  ])
})
