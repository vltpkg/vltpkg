/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/ci.ts > TAP > command execution > should call install with expectLockfile true 1`] = `
install expectLockfile=true

`

exports[`test/commands/ci.ts > TAP > usage > usage output 1`] = `
Usage:
  vlt ci

Clean install from lockfile. Deletes node_modules and installs dependencies
exactly as specified in vlt-lock.json. Equivalent to running 'vlt install
--expect-lockfile' after deleting node_modules.

  Examples

    Clean install from lockfile

    ​vlt ci

`
