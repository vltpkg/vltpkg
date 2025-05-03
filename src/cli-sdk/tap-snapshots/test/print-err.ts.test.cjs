/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/print-err.ts > TAP > ECONFIG > no cause > must match snapshot 1`] = `
Array [
  "Config Error: Invalid config keys",
]
`

exports[`test/print-err.ts > TAP > ECONFIG > with cause > must match snapshot 1`] = `
Array [
  "Config Error: Invalid config keys",
  "  Found: [ 'garbage' ]",
  "  Wanted: [ 'wanted' ]",
]
`

exports[`test/print-err.ts > TAP > EREQUEST > no cause > must match snapshot 1`] = `
Array [
  "Request Error: oh no! my request!",
  "  URL: https://x.y/",
  "  Method: GET",
]
`

exports[`test/print-err.ts > TAP > EREQUEST > with cause > must match snapshot 1`] = `
Array [
  "Request Error: oh no! my request!",
  "  Code: ECONNRESET",
  "  Syscall: read",
  "  URL: https://x.y/",
  "  Method: GET",
]
`
