/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/graph.ts > TAP > Graph > should print with special tag name 1`] = `
@vltpkg/graph.Graph { options: [Object], nodes: {}, edges: {} }
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
