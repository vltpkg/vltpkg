/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > filters mixed buildState values correctly > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
    "d",
  ],
  "nodes": Array [
    "b",
    "d",
    "my-project",
  ],
}
`

exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > properly removes dangling edges > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [
    "my-project",
  ],
}
`

exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > selects all nodes when all have built state > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
    "cycle-project",
  ],
}
`

exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > selects no nodes when none have built state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/built.ts > TAP > selects packages with built buildState > selects nodes with built buildState in simple graph > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
    "my-project",
  ],
}
`
