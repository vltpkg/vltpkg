/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/append-nodes.ts > TAP > append different type of dependencies > should install different type of deps on different conditions 1`] = `
Graph [@vltpkg/graph.Graph] {
  manifests: Map(3) {
    'file;.' => {
      name: 'my-project',
      version: '1.0.0',
      devDependencies: { foo: '^1.0.0' },
      optionalDependencies: { bar: '^1.0.0' }
    },
    'registry;;foo@1.0.0' => {
      name: 'foo',
      version: '1.0.0',
      devDependencies: { baz: '^1.0.0' }
    },
    'registry;;bar@1.0.0' => { name: 'bar', version: '1.0.0' }
  },
  edges: Set(2) {
    Edge [@vltpkg/graph.Edge] {
      from: Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;.',
        importer: true,
        integrity: undefined,
        manifest: [Object],
        name: 'my-project',
        version: '1.0.0',
        resolved: undefined
      },
      to: Node [@vltpkg/graph.Node] {
        edgesIn: [Set],
        edgesOut: Map(0) {},
        id: 'registry;;foo@1.0.0',
        importer: false,
        integrity: undefined,
        manifest: [Object],
        name: 'foo',
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
      },
      type: 'dev',
      spec: Spec {foo@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;.',
        importer: true,
        integrity: undefined,
        manifest: [Object],
        name: 'my-project',
        version: '1.0.0',
        resolved: undefined
      },
      to: Node [@vltpkg/graph.Node] {
        edgesIn: [Set],
        edgesOut: Map(0) {},
        id: 'registry;;bar@1.0.0',
        importer: false,
        integrity: undefined,
        manifest: [Object],
        name: 'bar',
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
      },
      type: 'optional',
      spec: Spec {bar@^1.0.0}
    }
  },
  nodes: Map(3) {
    'file;.' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: Map(2) {
        'foo' => [Edge [@vltpkg/graph.Edge]],
        'bar' => [Edge [@vltpkg/graph.Edge]]
      },
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: {
        name: 'my-project',
        version: '1.0.0',
        devDependencies: [Object],
        optionalDependencies: [Object]
      },
      name: 'my-project',
      version: '1.0.0',
      resolved: undefined
    },
    'registry;;foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;foo@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: { name: 'foo', version: '1.0.0', devDependencies: [Object] },
      name: 'foo',
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
    },
    'registry;;bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;bar@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: { name: 'bar', version: '1.0.0' },
      name: 'bar',
      version: '1.0.0',
      resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
    }
  },
  importers: Set(1) {
    Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: Map(2) {
        'foo' => [Edge [@vltpkg/graph.Edge]],
        'bar' => [Edge [@vltpkg/graph.Edge]]
      },
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: {
        name: 'my-project',
        version: '1.0.0',
        devDependencies: [Object],
        optionalDependencies: [Object]
      },
      name: 'my-project',
      version: '1.0.0',
      resolved: undefined
    }
  },
  mainImporter: <ref *1> Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(2) {
      'foo' => Edge [@vltpkg/graph.Edge] {
        from: [Circular *1],
        to: [Node [@vltpkg/graph.Node]],
        type: 'dev',
        spec: Spec {foo@^1.0.0}
      },
      'bar' => Edge [@vltpkg/graph.Edge] {
        from: [Circular *1],
        to: [Node [@vltpkg/graph.Node]],
        type: 'optional',
        spec: Spec {bar@^1.0.0}
      }
    },
    id: 'file;.',
    importer: true,
    integrity: undefined,
    manifest: {
      name: 'my-project',
      version: '1.0.0',
      devDependencies: { foo: '^1.0.0' },
      optionalDependencies: { bar: '^1.0.0' }
    },
    name: 'my-project',
    version: '1.0.0',
    resolved: undefined
  },
  extraneousDependencies: Set(0) {},
  missingDependencies: Set(0) {}
}
`

exports[`test/ideal/append-nodes.ts > TAP > append file type of nodes > should have a graph with file type dependencies 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node { id: 'file;linked', location: 'linked', resolved: 'linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        edgesOut: [
          Edge spec(bar@file:./bar) -prod-> to: Node {
            id: 'file;node_modules%2F.vlt%2Fregistry%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbar',
            location: 'node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo/bar',
            resolved: 'node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo/bar'
          },
          Edge spec(baz@file:./baz.tgz) -prod-> to: Node {
            id: 'file;node_modules%2F.vlt%2Fregistry%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbaz.tgz',
            location: 'node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo/baz.tgz',
            resolved: 'node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo/baz.tgz'
          }
        ]
      }
    ]
  }
]
`