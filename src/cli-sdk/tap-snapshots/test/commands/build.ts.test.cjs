/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/build.ts > TAP > command execution > successful build > should format human output for successful build 1`] = `
Build completed successfully.
`

exports[`test/commands/build.ts > TAP > command execution > successful build > should format json output for successful build 1`] = `
Object {
  "message": "Build completed successfully.",
  "success": true,
}
`

exports[`test/commands/build.ts > TAP > usage > should return usage information 1`] = `
Usage:
  vlt build [skip] [--scope=<query>]

Build the project based on the current dependency graph.

This command processes the installed packages in node_modules and runs any
necessary build steps, such as lifecycle scripts and binary linking.
The build process is idempotent and will only perform work that is actually
needed based on the current state of the dependency graph.
Use --scope option to filter packages using DSS query language syntax.

  Subcommands

    skip
      Skip building queued packages and update lockfile

      ​vlt build skip [--scope=<query>]

  Options

    scope
      Query selector to filter packages using DSS syntax.

      ​--scope=<query>

`

exports[`test/commands/build.ts > TAP > views > human view - build > should return human-readable success message for build 1`] = `
Build completed successfully.
`

exports[`test/commands/build.ts > TAP > views > human view - skip > should return human-readable success message for skip 1`] = `
Skip completed successfully.
`

exports[`test/commands/build.ts > TAP > views > json view - build > should return json success object for build 1`] = `
Object {
  "message": "Build completed successfully.",
  "success": true,
}
`

exports[`test/commands/build.ts > TAP > views > json view - skip > should return json success object for skip 1`] = `
Object {
  "message": "Skip completed successfully.",
  "success": true,
}
`
