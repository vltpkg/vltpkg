/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/uninstall.ts > TAP > should uninstall a dependency 1`] = `
parse remove args from abbrev@2
uninstall

`

exports[`test/commands/uninstall.ts > TAP > usage 1`] = `
Usage:
  vlt uninstall [package ...]

The opposite of \`vlt install\`. Removes deps and updates vlt-lock.json and
package.json appropriately.

  Aliases

    ​rm

  Options

    workspace
      Limit uninstall targets to matching workspaces.

      ​--workspace=<path|glob>

    workspace-group
      Limit uninstall targets to workspace groups.

      ​--workspace-group=<name>

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

`
