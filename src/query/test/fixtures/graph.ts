import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { GraphLike, NodeLike } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecLike, SpecOptions } from '@vltpkg/spec/browser'
import type { Manifest, DependencyTypeShort } from '@vltpkg/types'

const specOptions = {
  registries: {
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const projectRoot = '.'
// NOTE: name is the only property that is being tracked in these fixture
export const newGraph = (rootName: string): GraphLike => {
  const graph = {} as GraphLike
  const addNode = newNode(graph)
  const mainImporter = addNode(rootName)
  mainImporter.id = joinDepIDTuple(['file', '.'])
  mainImporter.mainImporter = true
  mainImporter.importer = true
  mainImporter.graph = graph
  graph.importers = new Set([mainImporter])
  graph.mainImporter = mainImporter
  graph.nodes = new Map([[mainImporter.id, mainImporter]])
  graph.edges = new Set()

  return graph
}
export const newNode =
  (graph: GraphLike) =>
  (name: string, version = '1.0.0'): NodeLike => ({
    projectRoot,
    edgesIn: new Set(),
    edgesOut: new Map(),
    importer: false,
    mainImporter: false,
    graph,
    id: joinDepIDTuple(['registry', '', `${name}@${version}`]),
    name,
    version,
    location:
      'node_modules/.vlt/;;${name}@${version}/node_modules/${name}',
    manifest: { name, version },
    integrity: 'sha512-deadbeef',
    resolved: undefined,
    dev: false,
    optional: false,
    setResolved() {},
  })
const newEdge = (
  from: NodeLike,
  spec: SpecLike<Spec>,
  type: DependencyTypeShort,
  to?: NodeLike,
) => {
  const edge = { name: spec.name, from, to, spec, type }
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
}

// Returns a graph that looks like:
//
// my-project (#a.prod, #b.dev, #e.prod, #@x/y.dev)
// +-- a
// +-- b (#c.prod, #d.prod)
//     +-- c
//     +-- d (#e.prod #f.optional)
//         +-- e
//         +-- f
// +-- e
// +-- @x/y
//
export const getSimpleGraph = (): GraphLike => {
  const graph = newGraph('my-project')
  const addNode = newNode(graph)
  const [a, b, c, d, e, f, y] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    '@x/y',
  ].map(i => addNode(i)) as [
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
  ]
  b.dev = c.dev = d.dev = e.dev = f.dev = y.dev = true // deps of dev deps
  f.optional = true
  y.id = joinDepIDTuple(['file', 'y'])
  ;[a, b, c, d, e, f, y].forEach(i => {
    graph.nodes.set(i.id, i)
  })
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', '^1.0.0', specOptions),
    'dev',
    b,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('e', '^1.0.0', specOptions),
    'prod',
    e,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('@x/y', '^1.0.0', specOptions),
    'dev',
    y,
  )
  newEdge(b, Spec.parse('c', '^1.0.0', specOptions), 'prod', c)
  newEdge(b, Spec.parse('d', '^1.0.0', specOptions), 'prod', d)
  newEdge(d, Spec.parse('e', '^1.0.0', specOptions), 'prod', e)
  newEdge(d, Spec.parse('f', '^1.0.0', specOptions), 'optional', f)

  // give some nodes an expanded manifest so that we can test
  // more attribute selector scenarios
  b.manifest = {
    ...b.manifest,
    version: '2.0.0',
    scripts: {
      postinstall: 'postinstall',
      test: 'test',
    },
    contributors: [
      {
        name: 'Ruy Adorno',
        email: 'ruyadorno@example.com',
      },
    ],
  } as Manifest

  c.manifest = {
    ...c.manifest,
    peerDependenciesMeta: {
      foo: {
        optional: true,
      },
    },
    keywords: ['something', 'someother'],
  } as Manifest

  d.manifest = {
    ...d.manifest,
    private: true,
    a: {
      b: [
        {
          c: {
            d: 'foo',
          },
        },
        {
          c: {
            d: 'bar',
          },
        },
      ],
      e: ['foo', 'bar'],
    },
  } as Manifest
  return graph
}

// Returns a graph with a root node and a single workspace
export const getSingleWorkspaceGraph = (): GraphLike => {
  const graph = newGraph('ws')
  const addNode = newNode(graph)
  const w = addNode('w')
  w.id = joinDepIDTuple(['workspace', 'w'])
  graph.nodes.set(w.id, w)
  graph.importers.add(w)
  w.importer = true
  return graph
}

// Returns a complex graph with a multiple workspaces with dependencies
export const getMultiWorkspaceGraph = (): GraphLike => {
  const graph = newGraph('ws')
  const addNode = newNode(graph)
  const a = addNode('a')
  a.id = joinDepIDTuple(['workspace', 'a'])
  graph.nodes.set(a.id, a)
  graph.importers.add(a)
  a.importer = true
  const b = addNode('b')
  b.id = joinDepIDTuple(['workspace', 'b'])
  graph.nodes.set(b.id, b)
  graph.importers.add(b)
  b.importer = true
  const c = addNode('c')
  c.id = joinDepIDTuple(['workspace', 'c'])
  graph.nodes.set(c.id, c)
  graph.importers.add(c)
  c.importer = true
  const [d, e, f, y] = ['d', 'e', 'f', '@x/y'].map(i =>
    addNode(i),
  ) as [NodeLike, NodeLike, NodeLike, NodeLike, NodeLike]

  newEdge(b, Spec.parse('a', 'workspace:*', specOptions), 'prod', a)
  newEdge(b, Spec.parse('d', '^1.0.0', specOptions), 'prod', d)
  newEdge(b, Spec.parse('e', '^1.0.0', specOptions), 'prod', e)
  newEdge(a, Spec.parse('f', '^1.0.0', specOptions), 'prod', f)
  newEdge(
    graph.mainImporter,
    Spec.parse('@x/y', '^1.0.0', specOptions),
    'prod',
    y,
  )
  return graph
}

// Returns a graph that looks like:
//
// cycle-project (#a.prod)
// +-> a  <--------------+
//     +-> b (#a.prod) --+
//
export const getCycleGraph = (): GraphLike => {
  const graph = newGraph('cycle-project')
  graph.mainImporter.manifest = {
    ...graph.mainImporter.manifest,
    dependencies: {
      a: '^1.0.0',
    },
  }
  const addNode = newNode(graph)

  const a = addNode('a')
  a.manifest = {
    ...a.manifest,
    scripts: {
      test: 'foo',
    },
    dependencies: {
      b: '^1.0.0',
    },
  }
  graph.nodes.set(a.id, a)
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )

  const b = addNode('b')
  b.manifest = {
    ...b.manifest,
    scripts: {
      test: 'bar',
    },
    dependencies: {
      a: '^1.0.0',
    },
  }
  graph.nodes.set(b.id, b)
  newEdge(a, Spec.parse('b', '^1.0.0', specOptions), 'prod', b)
  newEdge(b, Spec.parse('a', '^1.0.0', specOptions), 'prod', a)

  return graph
}

// Returns a graph in which nodes have no manifest data
export const getMissingManifestsGraph = (): GraphLike => {
  const graph = newGraph('missing-manifest-project')
  delete graph.mainImporter.manifest

  const addNode = newNode(graph)
  const a = addNode('a')
  delete a.manifest
  graph.nodes.set(a.id, a)
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )
  return graph
}

// Returns a graph in which nodes are missing
export const getMissingNodeGraph = (): GraphLike => {
  const graph = newGraph('node-missing-project')
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', '^1.0.0', specOptions),
    'dev',
  )
  return graph
}

export const getSemverRichGraph = (): GraphLike => {
  const graph = newGraph('semver-rich-project')
  const addNode = newNode(graph)
  const [a, b, c, d, e, f, g] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
  ].map(i => addNode(i)) as [
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
  ]
  ;[a, b, c, d, e, f, g].forEach(i => {
    graph.nodes.set(i.id, i)
  })
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', '~2.2.0', specOptions),
    'prod',
    b,
  )
  newEdge(b, Spec.parse('c', '3 || 4 || 5', specOptions), 'prod', c)
  newEdge(b, Spec.parse('d', '1.2 - 2.3.4', specOptions), 'prod', d)
  newEdge(
    graph.mainImporter,
    Spec.parse('e', '<=120', specOptions),
    'prod',
    e,
  )
  newEdge(d, Spec.parse('f', '4.x.x', specOptions), 'prod', f)
  newEdge(
    graph.mainImporter,
    Spec.parse('g', '1.2.3-rc.1+rev.2', specOptions),
    'prod',
    g,
  )
  graph.mainImporter.manifest = {
    ...graph.mainImporter.manifest,
    dependencies: {
      a: '^1.0.0',
      b: '~2.2.0',
      e: '<=120',
    },
  }
  a.version = '1.0.1'
  a.manifest = {
    ...a.manifest,
    version: '1.0.1',
  }
  b.version = '2.2.1'
  b.manifest = {
    ...b.manifest,
    version: '2.2.1',
    dependencies: {
      c: '3 || 4 || 5',
      d: '1.2 - 2.3.4',
    },
    engines: {
      node: '>=10',
    },
  }
  c.version = '3.4.0'
  c.manifest = {
    ...c.manifest,
    engines: {
      node: '>=24',
    },
    version: '3.4.0',
  }
  d.version = '2.3.4'
  d.manifest = {
    ...d.manifest,
    version: '2.3.4',
    dependencies: {
      e: '1.3.4-beta.1',
      f: '4.x.x',
    },
  }
  e.version = '120.0.0'
  e.manifest = {
    ...e.manifest,
    version: '120.0.0',
  }
  const e2 = addNode('e', '1.3.4-beta.1')
  graph.nodes.set(e2.id, e2)
  newEdge(
    d,
    Spec.parse('e', '=1.3.4-beta.1', specOptions),
    'prod',
    e2,
  )
  f.version = '4.5.6'
  f.manifest = {
    ...f.manifest,
    version: '4.5.6',
    arbitrarySemverValue: '2.0.0',
  } as Manifest
  g.version = '1.2.3-rc.1+rev.2'
  g.manifest = {
    ...g.manifest,
    version: '1.2.3-rc.1+rev.2',
  }
  return graph
}
