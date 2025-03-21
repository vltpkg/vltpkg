/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/pseudo/cve.ts > TAP > selects packages with a CVE alert > filter out any node that does not have the alert > must match snapshot 1`] = `
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

exports[`test/pseudo/cve.ts > TAP > selects packages with a CVE alert > filter out any node that does not match the quoted CVE ID > must match snapshot 1`] = `
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

exports[`test/pseudo/cve.ts > TAP > selects packages with a CVE alert > should not match an unseen CVE ID > must match snapshot 1`] = `
Object {
  "edges": Array [],
  "nodes": Array [],
}
`
