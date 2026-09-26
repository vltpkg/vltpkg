import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { Diff } from '../../src/diff.ts'
import { Edge } from '../../src/edge.ts'
import { Graph } from '../../src/graph.ts'
import { lockfileData } from '../../src/lockfile/save.ts'
import { Node } from '../../src/node.ts'
import {
  isUnsupported,
  optionalFail,
  pruneUnsupportedOptional,
} from '../../src/reify/optional-fail.ts'

t.formatSnapshot = (obj: any) => {
  if (!!obj && obj instanceof Graph) {
    return lockfileData({ graph: obj })
  }
  return obj
}

t.test('register and optional node failure', async t => {
  const projectRoot = t.testdirName
  const actual = new Graph({
    projectRoot,
    mainManifest: {
      name: 'project',
      version: '1.2.3',
    },
  })
  const ideal = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {
      name: 'project',
      version: '1.2.3',
      optionalDependencies: { foo: '' },
    },
  })
  const foo = new Node(
    { graph: ideal, projectRoot },
    joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    {
      name: 'foo',
      version: '1.2.3',
      dependencies: { bar: '' },
    },
  )
  ideal.nodes.set(foo.id, foo)
  const fooEdge = new Edge(
    'optional',
    Spec.parse('foo@'),
    ideal.mainImporter,
    foo,
  )
  ideal.edges.add(fooEdge)
  foo.edgesIn.add(fooEdge)
  ideal.mainImporter.edgesOut.set('foo', fooEdge)
  const bar = new Node(
    { projectRoot, graph: ideal },
    joinDepIDTuple(['registry', '', 'bar@1.2.3']),
    {
      name: 'bar',
      version: '1.2.3',
      dependencies: { baz: '' },
    },
  )
  bar.optional = true
  const barEdge = new Edge('prod', Spec.parse('bar@'), foo, bar)
  bar.edgesIn.add(barEdge)
  foo.edgesOut.set('bar', barEdge)
  ideal.edges.add(barEdge)
  const baz = new Node(
    { projectRoot, graph: ideal },
    joinDepIDTuple(['registry', '', 'baz@1.2.3']),
    {
      name: 'baz',
      version: '1.2.3',
    },
  )
  baz.optional = true
  const bazEdge = new Edge('prod', Spec.parse('baz@'), bar, baz)
  baz.edgesIn.add(bazEdge)
  bar.edgesOut.set('baz', bazEdge)
  ideal.edges.add(bazEdge)
  const diff = new Diff(actual, ideal)
  t.equal(
    optionalFail(diff, foo),
    undefined,
    'does not provide an error handler if node is not optional',
  )
  if (!baz.isOptional()) {
    throw new Error('baz should be optional node')
  }

  const handler = optionalFail(diff, baz)
  t.type(
    handler,
    'function',
    'provides error handler for optional node',
  )
  handler()
  t.equal(
    diff.hadOptionalFailures,
    true,
    'diff records optional fails happened',
  )
  t.matchSnapshot(ideal)
  t.equal(ideal.nodes.get(bar.id), undefined)
  t.match(
    diff.nodes.delete,
    new Set([bar, baz]),
    'bar, baz moved to delete set',
  )
})

t.test('isUnsupported', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest: { name: 'project', version: '1.0.0' },
  })
  const node = graph.addNode(
    joinDepIDTuple(['registry', '', 'bare@1.0.0']),
    undefined,
    undefined,
    'bare',
    '1.0.0',
  )
  t.equal(isUnsupported(node), false, 'no manifest or platform data')
  node.platform = { cpu: ['wasm32'] }
  t.equal(isUnsupported(node), true, 'lockfile platform data')
})

t.test('pruneUnsupportedOptional', async t => {
  // importer -(optional)-> dep -> only, dep -> shared, importer -> shared
  const setup = (
    depManifest: Record<string, unknown>,
    depType: 'optional' | 'prod' = 'optional',
  ) => {
    const projectRoot = t.testdirName
    const mainManifest = { name: 'project', version: '1.0.0' }
    const actual = new Graph({ projectRoot, mainManifest })
    const graph = new Graph({ projectRoot, mainManifest })
    const root = graph.mainImporter
    const place = (
      from: Node,
      type: 'optional' | 'prod',
      name: string,
    ) =>
      graph.placePackage(from, type, Spec.parse(`${name}@1`), {
        name,
        version: '1.0.0',
        ...(name === 'dep' ? depManifest : {}),
      })!
    const shared = place(root, 'prod', 'shared')
    const dep = place(root, depType, 'dep')
    const only = place(dep, 'prod', 'only')
    place(dep, 'prod', 'shared')
    const diff = new Diff(actual, graph)
    return { graph, diff, dep, only, shared }
  }

  t.test('unsupported platform', async t => {
    const { graph, diff, dep, only, shared } = setup({
      cpu: ['wasm32'],
    })
    pruneUnsupportedOptional(diff)
    t.equal(diff.hadOptionalFailures, true)
    t.strictSame([...diff.nodes.add], [shared], 'shared kept')
    t.strictSame(
      new Set(diff.nodes.delete),
      new Set([dep, only]),
      'dep + deps only it needs moved to delete',
    )
    t.equal(graph.nodes.get(dep.id), undefined)
    t.equal(graph.nodes.get(only.id), undefined)
    t.notOk(
      [...diff.edges.add].some(
        e => e.from === dep || e.from === only,
      ),
      'no edges out of pruned nodes',
    )
  })

  t.test('deprecated', async t => {
    const { diff, dep } = setup({ deprecated: 'no' })
    pruneUnsupportedOptional(diff)
    t.ok(diff.nodes.delete.has(dep))
  })

  const kept: [
    string,
    Parameters<typeof setup>,
    (n: Node) => void,
  ][] = [
    ['not optional', [{ cpu: ['wasm32'] }, 'prod'], () => {}],
    [
      'not in store',
      [{ cpu: ['wasm32'] }],
      n => (n.inVltStore = () => false),
    ],
    ['extracted', [{ cpu: ['wasm32'] }], n => (n.extracted = true)],
    ['supported', [{}], () => {}],
  ]
  for (const [name, args, mod] of kept) {
    t.test(`kept: ${name}`, async t => {
      const { graph, diff, dep } = setup(...args)
      mod(dep)
      const add = new Set(diff.nodes.add)
      const edges = new Set(diff.edges.add)
      graph.gc = () => {
        throw new Error('gc should not run')
      }
      pruneUnsupportedOptional(diff)
      t.strictSame(diff.nodes.add, add)
      t.strictSame(diff.edges.add, edges)
      t.equal(diff.nodes.delete.size, 0)
      t.equal(diff.hadOptionalFailures, false)
    })
  }
})
