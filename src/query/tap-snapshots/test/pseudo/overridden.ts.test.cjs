/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > handles edges with spec.overridden false > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > preserves edges with both overridden and non-overridden pointing to same node > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "missing",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
  ],
}
`

exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > removes nodes that no longer have incoming edges > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "missing",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
  ],
}
`

exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > returns only overridden edges and their linked nodes > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "missing",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
  ],
}
`

exports[`test/pseudo/overridden.ts > TAP > selects edges with overridden specs > works with simple graph (no overridden edges) > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`
