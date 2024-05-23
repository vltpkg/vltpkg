/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/append-nodes.ts > TAP > append different type of dependencies > should install different type of deps on different conditions 1`] = `
Graph [@vltpkg/graph.Graph] {
  packageInfo: { manifest: [AsyncFunction: manifest] },
  manifests: Map(3) {
    'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies' => {
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
  nodes: Map(3) {
    'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: Map(3) {
        'foo' => [Edge [@vltpkg/graph.Edge]],
        'bar' => [Edge [@vltpkg/graph.Edge]],
        'missing' => [Edge [@vltpkg/graph.Edge]]
      },
      id: 'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies',
      importer: true,
      manifest: {
        name: 'my-project',
        version: '1.0.0',
        devDependencies: [Object],
        optionalDependencies: [Object]
      }
    },
    'registry;;foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;foo@1.0.0',
      importer: false,
      manifest: { name: 'foo', version: '1.0.0', devDependencies: [Object] }
    },
    'registry;;bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;bar@1.0.0',
      importer: false,
      manifest: { name: 'bar', version: '1.0.0' }
    }
  },
  importers: Set(1) {
    Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: Map(3) {
        'foo' => [Edge [@vltpkg/graph.Edge]],
        'bar' => [Edge [@vltpkg/graph.Edge]],
        'missing' => [Edge [@vltpkg/graph.Edge]]
      },
      id: 'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies',
      importer: true,
      manifest: {
        name: 'my-project',
        version: '1.0.0',
        devDependencies: [Object],
        optionalDependencies: [Object]
      }
    }
  },
  mainImporter: <ref *1> Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(3) {
      'foo' => Edge [@vltpkg/graph.Edge] {
        from: [Circular *1],
        to: [Node [@vltpkg/graph.Node]],
        type: 'devDependencies',
        spec: Spec {foo@^1.0.0}
      },
      'bar' => Edge [@vltpkg/graph.Edge] {
        from: [Circular *1],
        to: [Node [@vltpkg/graph.Node]],
        type: 'optionalDependencies',
        spec: Spec {bar@^1.0.0}
      },
      'missing' => Edge [@vltpkg/graph.Edge] {
        from: [Circular *1],
        to: undefined,
        type: 'dependencies',
        spec: Spec {missing@^1.0.0}
      }
    },
    id: 'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies',
    importer: true,
    manifest: {
      name: 'my-project',
      version: '1.0.0',
      devDependencies: { foo: '^1.0.0' },
      optionalDependencies: { bar: '^1.0.0' }
    }
  },
  missingDependencies: Set(1) {
    Edge [@vltpkg/graph.Edge] {
      from: <ref *1> Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;%2F%2F%2Fsrc%2Fgraph%2F.tap%2Ffixtures%2Ftest-append-nodes.ts-append-different-type-of-dependencies',
        importer: true,
        manifest: [Object]
      },
      to: undefined,
      type: 'dependencies',
      spec: Spec {missing@^1.0.0}
    }
  }
}
`
