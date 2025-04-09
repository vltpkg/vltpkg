/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/empty.ts > TAP > selects packages with no dependencies > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/empty.ts > TAP > selects packages with no dependencies > returns no nodes in cycle graph > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/empty.ts > TAP > selects packages with no dependencies > selects nodes with no outgoing edges in simple graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "@x/y",
    "a",
    "c",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "@x/y",
    "a",
    "c",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/empty.ts > TAP > selects packages with no dependencies > selects nodes with no outgoing edges in workspace graph > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
    "ws",
  ],
}
`
