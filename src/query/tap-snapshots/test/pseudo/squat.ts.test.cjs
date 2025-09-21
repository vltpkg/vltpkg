/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/squat.ts > TAP > pseudo state form - :squat without parameters > should match any packages with squat alerts 1`] = `
Object {
  "edges": Array [
    "file·.->··e@1.0.0",
    "··d@1.0.0->··e@1.0.0",
    "··d@1.0.0->··f@1.0.0",
  ],
  "nodes": Array [
    "··e@1.0.0",
    "··f@1.0.0",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > filter out any node that does not have the squat alert > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
  ],
  "nodes": Array [
    "e",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > filter out using unquoted param > must match snapshot 1`] = `
Object {
  "edges": Array [
    "f",
  ],
  "nodes": Array [
    "f",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > filter using numbered param > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
  ],
  "nodes": Array [
    "e",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > greater than comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "f",
  ],
  "nodes": Array [
    "f",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > greater than or equal to comparator - exact match (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > greater than or equal to comparator with number (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "f",
  ],
  "nodes": Array [
    "f",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > less than comparator with number (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
  ],
  "nodes": Array [
    "e",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > less than or equal to comparator - exact match (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/squat.ts > TAP > selects packages with a specific squat kind > less than or equal to comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "e",
    "e",
  ],
  "nodes": Array [
    "e",
  ],
}
`
