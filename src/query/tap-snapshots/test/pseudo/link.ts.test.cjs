/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/link.ts > TAP > selects file links and tar.gz packages > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/link.ts > TAP > selects file links and tar.gz packages > selects nodes that are file links in simple graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "@x/y",
  ],
  "nodes": Array [
    "@x/y",
  ],
}
`

exports[`test/pseudo/link.ts > TAP > selects file links and tar.gz packages > selects nodes that are file links or tar.gz in linked graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "d",
  ],
  "nodes": Array [
    "a",
  ],
}
`
