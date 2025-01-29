/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/install.ts > TAP > should call install with expected options 1`] = `
parse add args 
install

`

exports[`test/commands/install.ts > TAP > should install adding a new dependency 1`] = `
parse add args 
install
parse add args from abbrev@2, with values save-dev,true
install

`

exports[`test/commands/install.ts > TAP > usage 1`] = `
Usage:
  vlt install [packages ...]

Install the specified packages, updating package.json and vlt-lock.json
appropriately.

  Aliases

    ​i, add

`
