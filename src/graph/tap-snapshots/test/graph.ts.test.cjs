/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
@vltpkg/graph.Graph { registries: {}, nodes: [Object], edges: {} }
`

exports[`test/graph.ts > TAP > using placePackage > should find and fix nameless spec packages 1`] = `
@vltpkg/graph.Graph {
  registries: {},
  nodes: {
    'file;.': [ 0, 'my-project' ],
    ';;bar@1.0.0': [ 0, 'bar' ],
    ';;foo@1.0.0': [ 0, 'foo' ],
    'file;a': [ 0, 'a' ]
  },
  edges: {
    'file;. missing': 'prod ^1.0.0 missing',
    'file;. bar': 'prod ^1.0.0 ;;bar@1.0.0',
    'file;. foo': 'prod ^1.0.0 ;;foo@1.0.0',
    'file;. a': 'prod file:./a file;a',
    ';;bar@1.0.0 baz': 'prod ^1.0.0 missing'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > should have removed baz from the graph 1`] = `
@vltpkg/graph.Graph {
  registries: {},
  nodes: {
    'file;.': [ 0, 'my-project' ],
    ';;bar@1.0.0': [ 0, 'bar' ],
    ';;foo@1.0.0': [ 0, 'foo' ]
  },
  edges: {
    'file;. missing': 'prod ^1.0.0 missing',
    'file;. bar': 'prod ^1.0.0 ;;bar@1.0.0',
    'file;. foo': 'prod ^1.0.0 ;;foo@1.0.0',
    ';;bar@1.0.0 baz': 'prod ^1.0.0 missing'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > the graph 1`] = `
@vltpkg/graph.Graph {
  registries: {},
  nodes: {
    'file;.': [ 0, 'my-project' ],
    ';;bar@1.0.0': [ 0, 'bar' ],
    ';;baz@1.0.0': [ 0, 'baz' ],
    ';;foo@1.0.0': [ 0, 'foo' ]
  },
  edges: {
    'file;. missing': 'prod ^1.0.0 missing',
    'file;. bar': 'prod ^1.0.0 ;;bar@1.0.0',
    'file;. foo': 'prod ^1.0.0 ;;foo@1.0.0',
    ';;bar@1.0.0 baz': 'prod ^1.0.0 ;;baz@1.0.0',
    ';;baz@1.0.0 foo': 'prod ^1.0.0 ;;foo@1.0.0'
  }
}
`

exports[`test/graph.ts > TAP > workspaces > should have root and workspaces as importers 1`] = `
Set {
  Node {
    "dev": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "id": "file;.",
    "importer": true,
    "integrity": undefined,
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "optional": false,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
  Node {
    "dev": false,
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
    "optional": false,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
  Node {
    "dev": false,
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
    "optional": false,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
}
`
