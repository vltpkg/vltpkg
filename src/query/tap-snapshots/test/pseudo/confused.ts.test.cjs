/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/confused.ts > TAP > nodes with confused=true flag > filter out nodes that are not confused > must match snapshot 1`] = `
Object {
  "edges": Array [
    "a",
    "e",
    "e",
  ],
  "nodes": Array [
    "a",
    "e",
  ],
}
`

exports[`test/pseudo/confused.ts > TAP > selects packages with a manifestConfusion alert > filter out any node that does not have the alert > must match snapshot 1`] = `
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
