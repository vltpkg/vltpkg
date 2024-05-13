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
  edges: Set(3) {
    Edge [@vltpkg/graph.Edge] {
      from: Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;.',
        importer: true,
        integrity: undefined,
        manifest: [Object],
        resolved: undefined
      },
      to: Node [@vltpkg/graph.Node] {
        edgesIn: [Set],
        edgesOut: Map(0) {},
        id: 'registry;;foo@1.0.0',
        importer: false,
        integrity: undefined,
        manifest: [Object],
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
      },
      type: 'devDependencies',
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
        resolved: undefined
      },
      to: Node [@vltpkg/graph.Node] {
        edgesIn: [Set],
        edgesOut: Map(0) {},
        id: 'registry;;bar@1.0.0',
        importer: false,
        integrity: undefined,
        manifest: [Object],
        resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
      },
      type: 'optionalDependencies',
      spec: Spec {bar@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;.',
        importer: true,
        integrity: undefined,
        manifest: [Object],
        resolved: undefined
      },
      to: undefined,
      type: 'dependencies',
      spec: Spec {missing@^1.0.0}
    }
  },
  nodes: Map(3) {
    'file;.' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: Map(3) {
        'foo' => [Edge [@vltpkg/graph.Edge]],
        'bar' => [Edge [@vltpkg/graph.Edge]],
        'missing' => [Edge [@vltpkg/graph.Edge]]
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
      resolved: undefined
    },
    'registry;;foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;foo@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: { name: 'foo', version: '1.0.0', devDependencies: [Object] },
      resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
    },
    'registry;;bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(1) { [Edge [@vltpkg/graph.Edge]] },
      edgesOut: Map(0) {},
      id: 'registry;;bar@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: { name: 'bar', version: '1.0.0' },
      resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
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
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: {
        name: 'my-project',
        version: '1.0.0',
        devDependencies: [Object],
        optionalDependencies: [Object]
      },
      resolved: undefined
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
    id: 'file;.',
    importer: true,
    integrity: undefined,
    manifest: {
      name: 'my-project',
      version: '1.0.0',
      devDependencies: { foo: '^1.0.0' },
      optionalDependencies: { bar: '^1.0.0' }
    },
    resolved: undefined
  },
  missingDependencies: Set(1) {
    Edge [@vltpkg/graph.Edge] {
      from: <ref *1> Node [@vltpkg/graph.Node] {
        edgesIn: Set(0) {},
        edgesOut: [Map],
        id: 'file;.',
        importer: true,
        integrity: undefined,
        manifest: [Object],
        resolved: undefined
      },
      to: undefined,
      type: 'dependencies',
      spec: Spec {missing@^1.0.0}
    }
  }
}
`
