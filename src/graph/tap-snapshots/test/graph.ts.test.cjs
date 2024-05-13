/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
Graph [@vltpkg/graph.Graph] {
  packages: [PackageInventory [Map]],
  nodes: [Set],
  pkgNodes: [Map],
  root: [Node [@vltpkg/graph.Node]],
  missingDependencies: Set(0) {}
}
`

exports[`test/graph.ts > TAP > using placePackage > the graph 1`] = `
Graph [@vltpkg/graph.Graph] {
  packages: PackageInventory(4) [Map] {
    'my-project@1.0.0' => Package { location: '', origin: '' },
    'foo@1.0.0' => Package { location: './node_modules/foo', origin: '' },
    'bar@1.0.0' => Package { location: '', origin: '' },
    'baz@1.0.0' => Package { location: '', origin: '' },
    dependencyTypes: Map(4) {
      'dependencies' => 'prod',
      'devDependencies' => 'dev',
      'peerDependencies' => 'peer',
      'optionalDependencies' => 'optional'
    },
    pending: Set(3) { [Package], [Package], [Package] }
  },
  nodes: Set(4) {
    Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 0,
      isRoot: true,
      pkg: [Package]
    },
    Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: Map(0) {},
      id: 1,
      isRoot: false,
      pkg: [Package]
    },
    Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 2,
      isRoot: false,
      pkg: [Package]
    },
    Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 3,
      isRoot: false,
      pkg: [Package]
    }
  },
  pkgNodes: Map(4) {
    'my-project@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 0,
      isRoot: true,
      pkg: [Package]
    },
    'foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: Map(0) {},
      id: 1,
      isRoot: false,
      pkg: [Package]
    },
    'bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 2,
      isRoot: false,
      pkg: [Package]
    },
    'baz@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 3,
      isRoot: false,
      pkg: [Package]
    }
  },
  root: Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(3) {
      'foo' => [Edge [@vltpkg/graph.Edge]],
      'bar' => [Edge [@vltpkg/graph.Edge]],
      'missing' => [Edge [@vltpkg/graph.Edge]]
    },
    id: 0,
    isRoot: true,
    pkg: Package { location: '', origin: '' }
  },
  missingDependencies: Set(1) {
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: undefined,
      type: 'dependencies',
      spec: Spec {missing@^1.0.0}
    }
  }
}
`
