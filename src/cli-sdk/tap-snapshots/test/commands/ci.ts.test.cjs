/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/ci.ts > TAP > command execution > should call install with expectLockfile and cleanInstall true 1`] = `
install expectLockfile=true cleanInstall=true

`

exports[`test/commands/ci.ts > TAP > usage > usage output 1`] = `
Usage:
  vlt ci

Clean install from lockfile. Deletes node_modules and installs dependencies
exactly as specified in vlt-lock.json. This is similar to running 'vlt install
--expect-lockfile' but performs a clean install by removing node_modules first.

  Examples

    Clean install from lockfile

    ​vlt ci

  Options

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

    lockfile-only
      Only update lockfile and package.json files; skip node_modules operations.

      ​--lockfile-only

`
