/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/node.ts > TAP > Node > should print with special tag name 1`] = `
Node [@vltpkg/graph.Node] {
  confused: false,
  edgesIn: Set(0) {},
  edgesOut: Map(0) {},
  id: 'file·.',
  importer: true,
  mainImporter: true,
  graph: {},
  integrity: undefined,
  manifest: [Object],
  projectRoot: #
  registry: undefined,
  version: '1.0.0',
  resolved: undefined
}
`

exports[`test/node.ts > TAP > Node > should serialize node to JSON 1`] = `
{
  "id": "file·.",
  "name": "root",
  "version": "1.0.0",
  "location": "./path/to/importer",
  "importer": true,
  "manifest": {
    "name": "root",
    "version": "1.0.0"
  },
  "projectRoot": "{ROOT}",
  "dev": false,
  "optional": false,
  "confused": false
}
`

exports[`test/node.ts > TAP > Node > should stringify custom registry node 1`] = `
custom:foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify file node 1`] = `
file(my-package):my-package@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify file node with no manifest 1`] = `
file(my-package)
`

exports[`test/node.ts > TAP > Node > should stringify git node 1`] = `
git(github:vltpkg/foo):foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify git node with no manifest 1`] = `
git(github:vltpkg/foo)
`

exports[`test/node.ts > TAP > Node > should stringify manifest-less registry node 1`] = `
npm:foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify registry node 1`] = `
npm:foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify remote node 1`] = `
remote(https://x.com/x.tgz):x@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify remote node with no manifest 1`] = `
remote(https://x.com/x.tgz)
`

exports[`test/node.ts > TAP > Node > should stringify root node 1`] = `
root:root
`

exports[`test/node.ts > TAP > Node > should stringify workspace node 1`] = `
workspace:a
`

exports[`test/node.ts > TAP > rawManifest getter and setter > should serialize node to JSON 1`] = `
Object {
  "confused": true,
  "dev": false,
  "id": "··foo@1.0.0",
  "importer": false,
  "integrity": undefined,
  "location": "./node_modules/.vlt/··foo@1.0.0/node_modules/foo",
  "manifest": Object {
    "name": "foo",
    "version": "1.0.0",
  },
  "name": "foo",
  "optional": false,
  "projectRoot": "{ROOT}",
  "rawManifest": Object {
    "name": "test",
    "version": "1.0.0",
  },
  "resolved": undefined,
  "version": "1.0.0",
}
`
