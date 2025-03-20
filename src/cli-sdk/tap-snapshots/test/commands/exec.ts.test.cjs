/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/exec.ts > TAP > usage 1`] = `
Usage:
  vlt exec [command]

Run an arbitrary command, with the local installed packages first in the PATH.
Ie, this will run your locally installed package bins.

If no command is provided, then a shell is spawned in the current working
directory, with the locally installed package bins first in the PATH.

Note that any vlt configs must be specified *before* the command, as the
remainder of the command line options are provided to the exec process.

  Aliases

    ​x

`
