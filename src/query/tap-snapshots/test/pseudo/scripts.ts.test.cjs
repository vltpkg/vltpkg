/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > filters out nodes without build requirements > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > handles empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > handles mixed scenarios correctly > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "build-pkg1",
    "build-pkg2",
  ],
}
`

exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > selects git dependencies with prepare scripts > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "git-pkg",
    "git-postprepare-pkg",
    "git-preprepare-pkg",
  ],
}
`

exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > selects importer nodes with prepare scripts > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "importer-pkg",
  ],
}
`

exports[`test/pseudo/scripts.ts > TAP > selects packages that need to be built > selects nodes with install lifecycle scripts > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "install-pkg",
    "postinstall-pkg",
    "preinstall-pkg",
  ],
}
`
