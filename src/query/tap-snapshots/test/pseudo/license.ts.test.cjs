/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/license.ts > TAP > pseudo state form - :license without parameters > should match packages with any license defined (not none) 1`] = `
Object {
  "edges": Array [
    "file·.->·npm·e@1.0.0",
    "·npm·d@1.0.0->·npm·e@1.0.0",
  ],
  "nodes": Array [
    "·npm·e@1.0.0",
  ],
}
`

exports[`test/pseudo/license.ts > TAP > selects packages with a specific license kind > filter out any node that does not have the license > must match snapshot 1`] = `
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

exports[`test/pseudo/license.ts > TAP > selects packages with a specific license kind > filter out using unquoted param > must match snapshot 1`] = `
Object {
  "edges": Array [
    "f",
  ],
  "nodes": Array [
    "f",
  ],
}
`
