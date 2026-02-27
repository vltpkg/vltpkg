/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/registry.ts > TAP > selects nodes by registry > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/registry.ts > TAP > selects nodes by registry > returns no nodes for nonexistent registry > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/registry.ts > TAP > selects nodes by registry > selects all registry nodes in simple graph as npm > must match snapshot 1`] = `
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

exports[`test/pseudo/registry.ts > TAP > selects nodes by registry > selects custom registry nodes in aliased graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo/registry.ts > TAP > selects nodes by registry > selects default npm registry nodes in aliased graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "bar",
  ],
  "nodes": Array [
    "a",
    "d",
    "foo",
  ],
}
`
