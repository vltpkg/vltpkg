/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > filter out any node that does not have the vuln alert > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > filter out using unquoted param > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > filter using numbered param > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > greater than comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > greater than comparator with string kind (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > greater than or equal to comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > greater than or equal to comparator with string kind (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "d",
    "e",
    "e",
    "f",
  ],
  "nodes": Array [
    "c",
    "d",
    "e",
    "f",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > less than comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > less than comparator with string kind (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > less than or equal to comparator with number (unquoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > less than or equal to comparator with string kind (quoted) > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
  ],
  "nodes": Array [
    "a",
    "b",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > low matches both mildCVE and gptAnomaly > must match snapshot 1`] = `
Object {
  "edges": Array [
    "d",
    "f",
  ],
  "nodes": Array [
    "d",
    "f",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > medium matches both potentialVulnerability and gptSecurity > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
    "e",
    "e",
  ],
  "nodes": Array [
    "c",
    "e",
  ],
}
`

exports[`test/pseudo/vuln.ts > TAP > selects packages with vulnerability alerts > parameterless :vuln matches medium+ severity > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "b",
    "c",
    "e",
    "e",
  ],
  "nodes": Array [
    "a",
    "b",
    "c",
    "e",
  ],
}
`
