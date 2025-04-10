/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > handles an empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > handles attribute operator matching > must match snapshot 1`] = `
Object {
  "endsWith": Array [
    "@x/y",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "my-project",
  ],
  "startsWith": Array [
    "@x/y",
    "a",
    "c",
    "d",
    "e",
    "f",
    "my-project",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > returns no nodes for non-existent attribute > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > returns no nodes for non-existent nested attribute > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with a specific attribute > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with a specific attribute value > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with array value attributes > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with complex nested attributes > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with complex nested object in arrays > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with nested attribute paths > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > selects nodes with nested attribute value > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > supports mixed quoted and unquoted property names > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > supports multiple quoted strings for nested properties > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
  ],
  "nodes": Array [
    "d",
  ],
}
`

exports[`test/pseudo/attr.ts > TAP > selects packages based on attribute properties > supports quoted strings for property names > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`
