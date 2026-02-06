/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/run-exec.ts > TAP > usage 1`] = `
Usage:
  vlt run-exec [command ...]

If the first argument is a defined script in package.json, then this is
equivalent to \`vlt run\`.

If not, then this is equivalent to \`vlt exec\`.

  Aliases

    ​rx

  Options

    scope
      Filter execution targets using a DSS query.

      ​--scope=<query>

    workspace
      Limit execution to matching workspace paths or globs.

      ​--workspace=<path|glob>

    workspace-group
      Limit execution to named workspace groups.

      ​--workspace-group=<name>

    recursive
      Run across all selected workspaces.

      ​--recursive

    if-present
      When running across multiple packages, only include packages with matching
      scripts.

      ​--if-present

    bail
      When running across multiple workspaces, stop on first failure.

      ​--bail

    script-shell
      Shell to use when executing package.json scripts.

      ​--script-shell=<program>

`
