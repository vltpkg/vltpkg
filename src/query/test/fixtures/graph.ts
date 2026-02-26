import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import { normalizeManifest } from '@vltpkg/types'
import type {
  EdgeLike,
  GraphLike,
  NodeLike,
  Manifest,
  DependencyTypeShort,
} from '@vltpkg/types'
import type { SpecLike, SpecOptions } from '@vltpkg/spec/browser'

const specOptions = {
  registries: {
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const projectRoot = '.'
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
    confused: false,
    edgesIn: new Set(),
    edgesOut: new Map(),
    importer: false,
    mainImporter: false,
    graph,
    id: joinDepIDTuple(['registry', '', `${name}@${version}`]),
    name,
    version,
    location:
      joinDepIDTuple(['registry', '', `${name}@${version}`]) +
      `/node_modules/${name}`,
    manifest: normalizeManifest({ name, version }),
    integrity: 'sha512-deadbeef',
    resolved: undefined,
    dev: false,
    optional: false,
    options: specOptions,
    setConfusedManifest() {},
    setResolved() {},
    maybeSetConfusedManifest() {},
    workspaces: undefined,
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        version: this.version,
        location: this.location,
        importer: this.importer,
        manifest: this.manifest,
        projectRoot: this.projectRoot,
        integrity: this.integrity,
        resolved: this.resolved,
        dev: this.dev,
        optional: this.optional,
        confused: false,
      }
    },
  })
const newEdge = (
  from: NodeLike,
  spec: SpecLike<Spec>,
  type: DependencyTypeShort,
  to?: NodeLike,
) => {
  const edge = {
    name: spec.name,
    from,
    to,
    spec,
    type,
    get optional() {
      return this.type === 'peerOptional' || this.type === 'optional'
    },
    get peer() {
      return this.type === 'peer' || this.type === 'peerOptional'
    },
  }
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
}

const updateNodeVersion = (
  node: NodeLike,
  version: string,
  protocol = '',
) => {
  node.version = version
  node.id = joinDepIDTuple([
    'registry',
    protocol,
    `${node.name}@${version}`,
  ])
}

// Returns a graph that looks like:
//
// my-project (#a:prod, #b:dev, #e:prod, #@x/y:dev)
// +-- a
// +-- b (#c:prod, #d:prod)
//     +-- c
//     +-- d (#e:prod #f:optional)
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
    Spec.parse('@x/y', 'file:y', specOptions),
    'dev',
    y,
  )
  newEdge(b, Spec.parse('c', '^1.0.0', specOptions), 'prod', c)
  newEdge(b, Spec.parse('d', '^1.0.0', specOptions), 'prod', d)
  newEdge(d, Spec.parse('e', '^1.0.0', specOptions), 'prod', e)
  newEdge(d, Spec.parse('f', '^1.0.0', specOptions), 'optional', f)

  // give some nodes an expanded manifest so that we can test
  // more attribute selector scenarios
  b.manifest = normalizeManifest({
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
  } as Manifest)

  c.manifest = normalizeManifest({
    ...c.manifest,
    peerDependenciesMeta: {
      foo: {
        optional: true,
      },
    },
    keywords: ['something', 'someother'],
  } as Manifest)

  d.manifest = normalizeManifest({
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
  } as Manifest)
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
  graph.mainImporter.workspaces = new Map()
  graph.mainImporter.workspaces.set('w', {
    name: 'w',
    from: graph.mainImporter,
    spec: Spec.parse('w', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)
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

  // Set up workspaces property on mainImporter
  graph.mainImporter.workspaces = new Map()
  graph.mainImporter.workspaces.set('a', {
    name: 'a',
    from: graph.mainImporter,
    spec: Spec.parse('a', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)
  graph.mainImporter.workspaces.set('b', {
    name: 'b',
    from: graph.mainImporter,
    spec: Spec.parse('b', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)
  graph.mainImporter.workspaces.set('c', {
    name: 'c',
    from: graph.mainImporter,
    spec: Spec.parse('c', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)

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
// cycle-project (#a:prod)
// +-> a  <--------------+
//     +-> b (#a:prod) --+
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
  updateNodeVersion(a, '1.0.1')
  a.manifest = {
    ...a.manifest,
    version: '1.0.1',
  }
  updateNodeVersion(b, '2.2.1')
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
  updateNodeVersion(c, '3.4.0', 'custom')
  c.manifest = {
    ...c.manifest,
    engines: {
      node: '>=24',
    },
    version: '3.4.0',
  }
  updateNodeVersion(d, '2.3.4')
  d.manifest = {
    ...d.manifest,
    version: '2.3.4',
    dependencies: {
      e: '1.3.4-beta.1',
      f: '4.x.x',
    },
  }
  updateNodeVersion(e, '120.0.0')
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
  updateNodeVersion(f, '4.5.6')
  f.manifest = normalizeManifest({
    ...f.manifest,
    version: '4.5.6',
    arbitrarySemverValue: '2.0.0',
  } as Manifest)
  updateNodeVersion(g, '1.2.3-rc.1+rev.2')
  g.manifest = {
    ...g.manifest,
    version: '1.2.3-rc.1+rev.2',
  }
  return graph
}

// Returns a graph that looks like:
//
// link-project (#a.file, #b.registry, #c.tar.gz)
// +-- a (file link)
// +-- b (registry package)
// +-- c (tar.gz archive)
//
export const getLinkedGraph = (): GraphLike => {
  const graph = newGraph('link-project')
  const addNode = newNode(graph)

  // Create file link node 'a'
  const a = addNode('a')
  a.id = joinDepIDTuple(['file', 'a'])

  // Create registry node 'b'
  const b = addNode('b')

  // Create tar.gz node 'c'
  const c = addNode('c')
  c.id = joinDepIDTuple(['file', 'package.tar.gz'])

  // Add nodes to graph
  ;[a, b, c].forEach(i => {
    graph.nodes.set(i.id, i)
  })

  // Add edges from main importer to nodes
  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'file:a', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', '^1.0.0', specOptions),
    'prod',
    b,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('c', 'file:package.tar.gz', specOptions),
    'prod',
    c,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('d', 'file:d', specOptions),
    'prod',
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('e', 'file:e.tar.gz', specOptions),
    'prod',
  )

  return graph
}

// Returns a graph that looks like:
//
// aliased-project (#a:prod, #b[alias for foo]:prod, #c[alias for custom:c]:prod)
// +-- a (regular dependency)
// +-- b (aliased dependency for foo, npm:foo@^1.0.0)
//     +-- bar (aliased dependency for d, npm:d@^1.0.0)
// +-- c (custom registry aliased dependency, custom:c@^1.0.0)
//
export const getAliasedGraph = (): GraphLike => {
  const graph = newGraph('aliased-project')
  const addNode = newNode(graph)

  // Update main importer manifest to include
  // dependencies definitions
  graph.mainImporter.manifest = {
    ...graph.mainImporter.manifest,
    dependencies: {
      a: '^1.0.0',
      b: 'npm:foo@^1.0.0',
      c: 'custom:c@^1.0.0',
    },
  }

  // Create regular node 'a'
  const a = addNode('a')
  a.manifest = {
    ...a.manifest,
    version: '1.0.0',
  }

  // Create 'foo' node that will be aliased as 'b'
  const foo = addNode('foo')
  foo.manifest = {
    ...foo.manifest,
    dependencies: {
      bar: 'npm:d@^1.0.0',
    },
    version: '1.0.0',
  }

  // Create 'd' node that will be aliased as 'bar' (dependency of 'b')
  const d = addNode('d')
  d.manifest = {
    ...d.manifest,
    version: '1.0.0',
  }

  // Create 'c' node from custom registry
  const c = addNode('c')
  c.id = joinDepIDTuple(['registry', 'custom', 'c@1.0.0'])
  c.manifest = {
    ...c.manifest,
    version: '1.0.0',
  }

  // Add nodes to graph
  ;[a, foo, d, c].forEach(i => {
    graph.nodes.set(i.id, i)
  })

  // Add edges from main importer to nodes
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )

  // Add edge for aliased dependency 'b' -> 'foo'
  newEdge(
    graph.mainImporter,
    Spec.parse('b', 'npm:foo@^1.0.0', specOptions),
    'prod',
    foo,
  )

  // Add edge for custom registry aliased dependency 'c'
  newEdge(
    graph.mainImporter,
    Spec.parse('c', 'custom:c@^1.0.0', specOptions),
    'prod',
    c,
  )

  // Add edge for nested aliased dependency 'bar' -> 'd'
  newEdge(
    foo,
    Spec.parse('bar', 'npm:d@^1.0.0', specOptions),
    'prod',
    d,
  )

  return graph
}

// Returns a graph with path-based dependencies for testing :path() selector
//
// flowchart TD
//   root --> a:::workspace
//   root --> b:::workspace
//   root --> c:::workspace
//   c --> b
//   b --> a
//   c --> x:::file
//   b --> x:::file
//   c --> y:::file
//
//   classDef workspace fill:skyblue
//   classDef file fill:lightgray
//   classDef dev fill:palegreen
//   classDef optional fill:cornsilk
//
export const getPathBasedGraph = (): GraphLike => {
  const graph = newGraph('path-based-project')
  const addNode = newNode(graph)

  // Create workspace nodes
  const a = addNode('a')
  a.id = joinDepIDTuple(['workspace', 'packages/a'])
  a.location = 'packages/a'
  a.importer = true

  const b = addNode('b')
  b.id = joinDepIDTuple(['workspace', 'packages/b'])
  b.location = 'packages/b'
  b.importer = true

  const c = addNode('c')
  c.id = joinDepIDTuple(['workspace', 'c'])
  c.location = 'c'
  c.importer = true

  // Create file nodes
  const x = addNode('x')
  x.id = joinDepIDTuple(['file', 'x'])
  x.location = 'x'

  const y = addNode('y')
  y.id = joinDepIDTuple(['file', 'packages/a/y'])
  y.location = 'packages/a/y'

  // Add nodes to graph
  ;[a, b, c, x, y].forEach(i => {
    graph.nodes.set(i.id, i)
  })

  // Add workspace nodes as importers
  graph.importers.add(a)
  graph.importers.add(b)
  graph.importers.add(c)

  // Set up workspaces property on mainImporter
  graph.mainImporter.workspaces = new Map()
  graph.mainImporter.workspaces.set('a', {
    name: 'a',
    from: graph.mainImporter,
    spec: Spec.parse('a', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)
  graph.mainImporter.workspaces.set('b', {
    name: 'b',
    from: graph.mainImporter,
    spec: Spec.parse('b', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)
  graph.mainImporter.workspaces.set('c', {
    name: 'c',
    from: graph.mainImporter,
    spec: Spec.parse('c', 'workspace:*', specOptions),
    type: 'prod',
  } satisfies EdgeLike)

  // Add edges to create the dependency structure
  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'workspace:*', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', 'workspace:*', specOptions),
    'prod',
    b,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('c', 'workspace:*', specOptions),
    'prod',
    c,
  )

  // c -> b
  newEdge(c, Spec.parse('b', 'workspace:*', specOptions), 'prod', b)

  // b -> a
  newEdge(b, Spec.parse('a', 'workspace:*', specOptions), 'prod', a)

  // c -> x
  newEdge(c, Spec.parse('x', 'file:x', specOptions), 'prod', x)

  // b -> x
  newEdge(b, Spec.parse('x', 'file:x', specOptions), 'prod', x)

  // c -> y
  newEdge(
    c,
    Spec.parse('y', 'file:packages/a/y', specOptions),
    'prod',
    y,
  )

  return graph
}

// Returns a graph with git dependencies for testing :hostname() selector
//
// git-project (#a:prod[github], #b:prod[gitlab], #c:prod[full-url-git])
// +-- a (github:user/repo)
// +-- b (gitlab:user/repo)
// +-- c (git+ssh://git@custom-git.example.com/repo.git)
//
export const getGitGraph = (): GraphLike => {
  const graph = newGraph('git-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple(['git', 'github:user/repo', 'semver:^1.0.0'])
  graph.nodes.set(a.id, a)

  const b = addNode('b')
  b.id = joinDepIDTuple(['git', 'gitlab:user/repo', 'semver:^1.0.0'])
  graph.nodes.set(b.id, b)

  const c = addNode('c')
  c.id = joinDepIDTuple([
    'git',
    'git+ssh://git@custom-git.example.com/repo.git',
    'semver:^1.0.0',
  ])
  graph.nodes.set(c.id, c)

  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'github:user/repo', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', 'gitlab:user/repo', specOptions),
    'prod',
    b,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse(
      'c',
      'git+ssh://git@custom-git.example.com/repo.git',
      specOptions,
    ),
    'prod',
    c,
  )

  return graph
}

// Returns a graph with a dep from an unknown registry name
// (to test the fallback to options.registry)
//
// unknown-registry-project (#a:prod[unknownreg])
// +-- a (from registry "unknownreg" that doesn't exist in registries map)
//
export const getUnknownRegistryGraph = (): GraphLike => {
  const graph = newGraph('unknown-registry-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple(['registry', 'unknownreg', 'a@1.0.0'])
  graph.nodes.set(a.id, a)

  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )

  return graph
}

// Returns a graph with a custom named git host (not in gitHostWebsites)
// to test the fallback path that parses git-hosts template URLs
//
// custom-git-host-project (#a:prod[customhost])
// +-- a (customhost:user/repo)
//
export const getCustomGitHostGraph = (): GraphLike => {
  const graph = newGraph('custom-git-host-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple([
    'git',
    'customhost:user/repo',
    'semver:^1.0.0',
  ])
  // Override options to include custom git host
  a.options = {
    ...specOptions,
    'git-hosts': {
      customhost: 'git+ssh://git@myserver.example.com:$1/$2.git',
    },
  }
  graph.nodes.set(a.id, a)

  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'github:user/repo', specOptions),
    'prod',
    a,
  )

  return graph
}

// Returns a graph with a git dep whose remote is an
// unparseable URL (to cover the catch branch)
//
// broken-git-project (#a:prod[broken-git])
// +-- a (notahost:broken:url)
//
export const getBrokenGitGraph = (): GraphLike => {
  const graph = newGraph('broken-git-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple([
    'git',
    'notahost:broken:url',
    'semver:^1.0.0',
  ])
  graph.nodes.set(a.id, a)

  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'github:user/repo', specOptions),
    'prod',
    a,
  )

  return graph
}

// Returns a graph with an https:// git remote (plain URL, no named host)
//
// https-git-project (#a:prod[https-git])
// +-- a (https://git.example.org/repo.git)
//
export const getHttpsGitGraph = (): GraphLike => {
  const graph = newGraph('https-git-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple([
    'git',
    'https://git.example.org/repo.git',
    'semver:^1.0.0',
  ])
  graph.nodes.set(a.id, a)

  newEdge(
    graph.mainImporter,
    Spec.parse(
      'a',
      'git+https://git.example.org/repo.git',
      specOptions,
    ),
    'prod',
    a,
  )

  return graph
}

// Returns a graph with a remote (URL) dependency
//
// remote-project (#a:prod[remote])
// +-- a (https://cdn.example.com/pkg.tgz)
//
export const getRemoteGraph = (): GraphLike => {
  const graph = newGraph('remote-project')
  const addNode = newNode(graph)

  const a = addNode('a')
  a.id = joinDepIDTuple(['remote', 'https://cdn.example.com/pkg.tgz'])
  graph.nodes.set(a.id, a)

  newEdge(
    graph.mainImporter,
    Spec.parse('a', 'https://cdn.example.com/pkg.tgz', specOptions),
    'prod',
    a,
  )

  return graph
}
