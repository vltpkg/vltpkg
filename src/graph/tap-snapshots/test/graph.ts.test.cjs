/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
@vltpkg/graph.Graph { lockfileVersion: 0, options: [Object], nodes: {}, edges: {} }
`

exports[`test/graph.ts > TAP > using placePackage > should add a type=git package 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [ 0, 'foo', <3 empty items>, { name: 'foo', version: '1.0.0' } ],
    'file·a': [ 0, 'a', <3 empty items>, { name: 'a', version: '1.0.0' } ],
    'git·github%3Afoo§bar·': [ 0, 'bar', <3 empty items>, { name: 'bar', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    'file·. a': 'prod file:./a file·a',
    'file·. bar': 'prod github:foo/bar git·github%3Afoo§bar·'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > should find and fix nameless spec packages 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [ 0, 'foo', <3 empty items>, { name: 'foo', version: '1.0.0' } ],
    'file·a': [ 0, 'a', <3 empty items>, { name: 'a', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    'file·. a': 'prod file:./a file·a'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > should have removed baz from the graph 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··foo@1.0.0': [ 0, 'foo', <3 empty items>, { name: 'foo', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0'
  }
}
`

exports[`test/graph.ts > TAP > using placePackage > the graph 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 0,
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.0.0', dependencies: [Object] }
    ],
    '··baz@1.0.0': [
      0,
      'baz',
      <3 empty items>,
      { name: 'baz', version: '1.0.0', dist: [Object] }
    ],
    '··foo@1.0.0': [ 0, 'foo', <3 empty items>, { name: 'foo', version: '1.0.0' } ]
  },
  edges: {
    'file·. missing': 'prod ^1.0.0 MISSING',
    'file·. bar': 'prod ^1.0.0 ··bar@1.0.0',
    'file·. foo': 'prod ^1.0.0 ··foo@1.0.0',
    '··bar@1.0.0 baz': 'prod ^1.0.0 ··baz@1.0.0',
    '··baz@1.0.0 foo': 'prod ^1.0.0 ··foo@1.0.0'
  }
}
`

exports[`test/graph.ts > TAP > workspaces > should have root and workspaces as importers 1`] = `
Set {
  Node {
    "confused": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "graph": "Graph {}",
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "mainImporter": true,
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
  Node {
    "confused": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "graph": "Graph {}",
    "id": "workspace·packages§b",
    "importer": true,
    "integrity": undefined,
    "mainImporter": false,
    "manifest": Object {
      "name": "b",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
  Node {
    "confused": false,
    "edgesIn": Set {},
    "edgesOut": Map {},
    "graph": "Graph {}",
    "id": "workspace·packages§a",
    "importer": true,
    "integrity": undefined,
    "mainImporter": false,
    "manifest": Object {
      "name": "a",
      [Symbol.for(indent)]: "",
      [Symbol.for(newline)]: "",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "projectRoot": #
    "registry": undefined,
    "resolved": undefined,
    "version": "1.0.0",
  },
}
`
