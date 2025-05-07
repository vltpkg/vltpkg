/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/type.ts > TAP > selects nodes by type > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/type.ts > TAP > selects nodes by type > returns no nodes when type does not match > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/type.ts > TAP > selects nodes by type > selects nodes of specified type in simple graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/type.ts > TAP > selects nodes by type > selects nodes of specified type in workspace graph > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "w",
  ],
}
`
