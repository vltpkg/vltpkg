/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/build.ts > TAP > command execution > successful build > should format human output for successful build 1`] = `
📦 All packages are already built.
`

exports[`test/commands/build.ts > TAP > command execution > successful build > should format json output for successful build 1`] = `
Object {
  "failure": Array [],
  "message": "No packages needed building.",
  "success": Array [],
}
`

exports[`test/commands/build.ts > TAP > usage > should return usage information 1`] = `
Usage:
  vlt build [query]
  vlt build [--target=<query>]

Build the project based on the current dependency graph.

This command processes the installed packages in node_modules and runs any
necessary build steps, such as lifecycle scripts and binary linking.
The build process is idempotent and will only perform work that is actually
needed based on the current state of the dependency graph.
Use --target option or provide a query as a positional argument to filter
packages using DSS query language syntax, otherwise it will target all packages
with scripts (:scripts) by default.

  Options

    target
      Query selector to filter packages using DSS syntax.

      ​--target=<query>

`

exports[`test/commands/build.ts > TAP > views > human view - build > should return human-readable success message for build 1`] = `
🔨 Built 2 packages successfully.
`

exports[`test/commands/build.ts > TAP > views > human view - no packages built > should show no packages message 1`] = `
📦 All packages are already built.
`

exports[`test/commands/build.ts > TAP > views > human view - with failures > should show both success and failure messages 1`] = `
🔨 Built 1 package successfully.
🔎 1 optional package failed to build.
`

exports[`test/commands/build.ts > TAP > views > json view - build > should return json success object for build 1`] = `
Object {
  "failure": Array [],
  "message": "Built 2 packages.",
  "success": Array [
    Object {
      "id": "node1",
      "name": "package1",
      "version": "1.0.0",
    },
    Object {
      "id": "node2",
      "name": "package2",
      "version": "2.0.0",
    },
  ],
}
`

exports[`test/commands/build.ts > TAP > views > json view - with failures > should show both success and failure json message 1`] = `
Object {
  "failure": Array [
    Object {
      "id": "node2",
      "name": "optional-pkg",
      "version": "1.0.0",
    },
  ],
  "message": "Built 1 package.",
  "success": Array [
    Object {
      "id": "node1",
      "name": "package1",
      "version": "1.0.0",
    },
  ],
}
`
