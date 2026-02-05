/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/version.ts > TAP > usage > usage 1`] = `
Usage:
  vlt version [<newversion> | major | minor | patch | premajor | preminor |
  prepatch | prerelease]

Bump a package's version.

Run in a package directory to bump the version and write the new data back to
package.json.

The \`<newversion>\` argument should be a valid semver string or a valid increment
type (one of patch, minor, major, prepatch, preminor, premajor, prerelease).

If run in a git repository, it will also create a version commit and tag.

  Options

    scope
      Filter version bump targets using a DSS query.

      ​--scope=<query>

    workspace
      Limit version bump targets to matching workspaces.

      ​--workspace=<path|glob>

    workspace-group
      Limit version bump targets to workspace groups.

      ​--workspace-group=<name>

    recursive
      Run version bump across all workspaces in the monorepo.

      ​--recursive

`
