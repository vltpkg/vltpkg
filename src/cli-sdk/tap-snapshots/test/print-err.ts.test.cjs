/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/print-err.ts > TAP > chain > must match snapshot 1`] = `
Error: root error
Cause:
  code: EUNKNOWN
  name: root error name
  Error: cause 1
  Error: cause 2
  Error: cause 3
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > chain > must match snapshot 2`] = `
Error: root error
Cause:
  Error: cause 1
  Error: cause 2
  Error: cause 3
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > ECONFIG > must match snapshot 1`] = `
Config Error: Invalid config keys
  Found: [ 'garbage' ]
  Wanted: string[]
  Valid Options: [ 'wanted' ]
`

exports[`test/print-err.ts > TAP > ECONFIG > must match snapshot 2`] = `
Config Error: Invalid config keys
`

exports[`test/print-err.ts > TAP > EREQUEST > with cause > must match snapshot 1`] = `
Request Error: oh no! my request!
  Code: ECONNRESET
  Syscall: read
  URL: https://x.y/
  Method: GET
`

exports[`test/print-err.ts > TAP > ERESOLVE > must match snapshot 1`] = `
Resolve Error: bloopy doop
`

exports[`test/print-err.ts > TAP > ERESOLVE > must match snapshot 2`] = `
Resolve Error: bloopy doop
  While fetching: https://x.y/
  To satisfy: x@1.x
  From: /home/base
  Response: { statusCode: 200 }
`

exports[`test/print-err.ts > TAP > error with a missing code > must match snapshot 1`] = `
Error: this is an error
Cause:
  found: wat
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > EUSAGE > must match snapshot 1`] = `
usage
Usage Error: bloopy doop
`

exports[`test/print-err.ts > TAP > EUSAGE > must match snapshot 2`] = `
usage
Usage Error: bloopy doop
  Found: x
  Valid options: a, b
`

exports[`test/print-err.ts > TAP > no cause > must match snapshot 1`] = `
Request Error: oh no! my request!
  URL: https://x.y/
  Method: GET
`

exports[`test/print-err.ts > TAP > not an error > must match snapshot 1`] = `
Unknown Error: false
`

exports[`test/print-err.ts > TAP > regular error with cause > must match snapshot 1`] = `
Error: foo bar
Cause:
  this_is_why_i_errored: true
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > regular error with no cause > must match snapshot 1`] = `
Error: foo bar
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > regular error with regular error cause > must match snapshot 1`] = `
Error: foo bar
Cause:
  Error: this_is_why_i_errored
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > regular error with weird cause > must match snapshot 1`] = `
Error: foo bar
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`

exports[`test/print-err.ts > TAP > unknown code and max lines > must match snapshot 1`] = `
Error: this is an error
Cause:
  code: ENOTACODEWEKNOWABOUT
  wanted: {
    __0__: 0,
    __1__: 1,
    __2__: 2,
    __3__: 3,
  ... 97 lines hidden ...
Stack:
  __STACK_TRACE__
  __STACK_TRACE__
  __STACK_TRACE__
`
