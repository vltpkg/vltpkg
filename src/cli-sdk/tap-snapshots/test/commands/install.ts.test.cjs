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

  Options

    save-dev
      Save installed packages to package.json as devDependencies.

      ​--save-dev

    save-optional
      Save installed packages to package.json as optionalDependencies.

      ​--save-optional

    save-peer
      Save installed packages to package.json as peerDependencies.

      ​--save-peer

    save-prod
      Save installed packages to package.json as dependencies.

      ​--save-prod

    workspace
      Limit installation targets to matching workspaces.

      ​--workspace=<path|glob>

    workspace-group
      Limit installation targets to workspace groups.

      ​--workspace-group=<name>

    expect-lockfile
      Fail if lockfile is missing or out of date.

      ​--expect-lockfile

    frozen-lockfile
      Fail if lockfile is missing or out of sync with package.json.

      ​--frozen-lockfile

    lockfile-only
      Only update lockfile and package.json files; skip node_modules operations.

      ​--lockfile-only

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

`
