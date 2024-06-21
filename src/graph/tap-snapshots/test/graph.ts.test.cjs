/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
Graph [@vltpkg/graph.Graph] {
  manifests: [Map],
  edges: Set(0) {},
  nodes: [Map],
  importers: [Set],
  mainImporter: [Node [@vltpkg/graph.Node]],
  extraneousDependencies: Set(0) {},
  missingDependencies: Set(0) {}
}
`

exports[`test/graph.ts > TAP > using placePackage > should have removed baz from the graph 1`] = `
Graph [@vltpkg/graph.Graph] {
  manifests: Map(3) {
    'file;.' => { name: 'my-project', version: '1.0.0', dependencies: [Object] },
    'registry;;foo@1.0.0' => { name: 'foo', version: '1.0.0' },
    'registry;;bar@1.0.0' => { name: 'bar', version: '1.0.0', dependencies: [Object] }
  },
  edges: Set(4) {
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {foo@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {bar@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: undefined,
      type: 'prod',
      spec: Spec {missing@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {foo@^1.0.0}
    }
  },
  nodes: Map(3) {
    'file;.' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: [Object],
      name: 'my-project',
      resolved: undefined
    },
    'registry;;foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: Map(0) {},
      id: 'registry;;foo@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: [Object],
      name: 'foo',
      resolved: undefined
    },
    'registry;;bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: Map(0) {},
      id: 'registry;;bar@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: [Object],
      name: 'bar',
      resolved: undefined
    }
  },
  importers: Set(1) {
    Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: [Object],
      name: 'my-project',
      resolved: undefined
    }
  },
  mainImporter: Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(3) {
      'foo' => [Edge [@vltpkg/graph.Edge]],
      'bar' => [Edge [@vltpkg/graph.Edge]],
      'missing' => [Edge [@vltpkg/graph.Edge]]
    },
    id: 'file;.',
    importer: true,
    integrity: undefined,
    manifest: { name: 'my-project', version: '1.0.0', dependencies: [Object] },
    name: 'my-project',
    resolved: undefined
  },
  extraneousDependencies: Set(0) {},
  missingDependencies: Set(1) {
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: undefined,
      type: 'prod',
      spec: Spec {missing@^1.0.0}
    }
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > the graph 1`] = `
Graph [@vltpkg/graph.Graph] {
  manifests: Map(4) {
    'file;.' => { name: 'my-project', version: '1.0.0', dependencies: [Object] },
    'registry;;foo@1.0.0' => { name: 'foo', version: '1.0.0' },
    'registry;;bar@1.0.0' => { name: 'bar', version: '1.0.0', dependencies: [Object] },
    'registry;;baz@1.0.0' => { name: 'baz', version: '1.0.0', dist: [Object] }
  },
  edges: Set(5) {
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {foo@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {bar@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {baz@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: undefined,
      type: 'prod',
      spec: Spec {missing@^1.0.0}
    },
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: [Node [@vltpkg/graph.Node]],
      type: 'prod',
      spec: Spec {foo@^1.0.0}
    }
  },
  nodes: Map(4) {
    'file;.' => Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: [Object],
      name: 'my-project',
      resolved: undefined
    },
    'registry;;foo@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: Map(0) {},
      id: 'registry;;foo@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: [Object],
      name: 'foo',
      resolved: undefined
    },
    'registry;;bar@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 'registry;;bar@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: [Object],
      name: 'bar',
      resolved: undefined
    },
    'registry;;baz@1.0.0' => Node [@vltpkg/graph.Node] {
      edgesIn: [Set],
      edgesOut: [Map],
      id: 'registry;;baz@1.0.0',
      importer: false,
      integrity: undefined,
      manifest: [Object],
      name: 'baz',
      resolved: undefined
    }
  },
  importers: Set(1) {
    Node [@vltpkg/graph.Node] {
      edgesIn: Set(0) {},
      edgesOut: [Map],
      id: 'file;.',
      importer: true,
      integrity: undefined,
      manifest: [Object],
      name: 'my-project',
      resolved: undefined
    }
  },
  mainImporter: Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(3) {
      'foo' => [Edge [@vltpkg/graph.Edge]],
      'bar' => [Edge [@vltpkg/graph.Edge]],
      'missing' => [Edge [@vltpkg/graph.Edge]]
    },
    id: 'file;.',
    importer: true,
    integrity: undefined,
    manifest: { name: 'my-project', version: '1.0.0', dependencies: [Object] },
    name: 'my-project',
    resolved: undefined
  },
  extraneousDependencies: Set(0) {},
  missingDependencies: Set(1) {
    Edge [@vltpkg/graph.Edge] {
      from: [Node [@vltpkg/graph.Node]],
      to: undefined,
      type: 'prod',
      spec: Spec {missing@^1.0.0}
    }
  }
}
`

exports[`test/graph.ts > TAP > workspaces > should have root and workspaces as importers 1`] = `
Set {
  Node {
    "edgesIn": Set {},
    "edgesOut": Map {},
    "id": "file;.",
    "importer": true,
    "integrity": undefined,
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "name": "my-project",
    "resolved": undefined,
  },
  Node {
    "edgesIn": Set {},
    "edgesOut": Map {},
    "id": "workspace;packages%2Fb",
    "importer": true,
    "integrity": undefined,
    "manifest": Object {
      "name": "b",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "name": "b",
    "resolved": undefined,
  },
  Node {
    "edgesIn": Set {},
    "edgesOut": Map {},
    "id": "workspace;packages%2Fa",
    "importer": true,
    "integrity": undefined,
    "manifest": Object {
      "name": "a",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "name": "a",
    "resolved": undefined,
  },
}
`
