/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/node.ts > TAP > Node > should print with special tag name 1`] = `
Node [@vltpkg/graph.Node] {
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
  "optional": false
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
foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify registry node 1`] = `
foo@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify remote node 1`] = `
remote(https://x.com/x.tgz):x@1.0.0
`

exports[`test/node.ts > TAP > Node > should stringify remote node with no manifest 1`] = `
remote(https://x.com/x.tgz)
`

exports[`test/node.ts > TAP > Node > should stringify root node 1`] = `
file(.):root@1.0.0
`
