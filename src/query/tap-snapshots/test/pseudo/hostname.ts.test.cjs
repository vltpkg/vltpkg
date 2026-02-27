/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > excludes file deps from hostname matching > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > excludes git deps with unparseable remote URLs > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > falls back to default registry for unknown registry name > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > handles empty partial state > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches custom named git host via template URL > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches custom registry deps by hostname > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches default registry deps by hostname > must match snapshot 1`] = `
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

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches git dep with plain https URL remote > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches git deps with full URL by hostname > must match snapshot 1`] = `
Object {
  "edges": Array [
    "c",
  ],
  "nodes": Array [
    "c",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches github git deps by hostname > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches gitlab git deps by hostname > must match snapshot 1`] = `
Object {
  "edges": Array [
    "b",
  ],
  "nodes": Array [
    "b",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > matches remote deps by hostname > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
  ],
  "nodes": Array [
    "a",
  ],
}
`

exports[`test/pseudo/hostname.ts > TAP > selects nodes by hostname > returns empty when hostname does not match > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`
