/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/smoke.ts > TAP > snapshots > vlix > (no command) > todo > output 1`] = `
todo: exec, but install if not present
[ 'todo' ]

`

exports[`test/smoke.ts > TAP > snapshots > vlr > (no command) > some-script > output 1`] = `
script output
{
  command: \`node -e "console.log('script output')"\`,
  args: [],
  cwd: '{{TEST_NAME}}',
  stdout: null,
  stderr: null,
  status: 0,
  signal: null,
  pre: undefined
}

`

exports[`test/smoke.ts > TAP > snapshots > vlrx > (no command) > some-script > output 1`] = `
script output
{
  command: \`node -e "console.log('script output')"\`,
  args: [],
  cwd: '{{TEST_NAME}}',
  stdout: null,
  stderr: null,
  status: 0,
  signal: null,
  pre: undefined
}

`

exports[`test/smoke.ts > TAP > snapshots > vlt > install > --help > output 1`] = `
vlt install [package ...]
Install the specified package, updating dependencies appropriately

`

exports[`test/smoke.ts > TAP > snapshots > vlt > install > (no args) > output 1`] = `

`

exports[`test/smoke.ts > TAP > snapshots > vlt > pkg > get > output 1`] = `
{
  "name": "hi"
}

`

exports[`test/smoke.ts > TAP > snapshots > vlt > pkg > get name > output 1`] = `
"hi"

`

exports[`test/smoke.ts > TAP > snapshots > vlt > pkg > get name version > output 1`] = `
{ROOT}/src/vlt/src/commands/pkg.ts:{LINE_NUMBER}
      throw error(
            ^


Error: get requires not more than 1 argument. use \`pick\` to get more than 1.
    at {STACK}
    at {STACK}
    at {STACK}

Node.js {NODE}

`

exports[`test/smoke.ts > TAP > snapshots > vlx > (no command) > missing-command > output 1`] = `
/bin/sh: missing-command: command not found
{
  command: 'missing-command',
  args: [],
  cwd: '{{TEST_NAME}}',
  stdout: null,
  stderr: null,
  status: 127,
  signal: null
}

`
