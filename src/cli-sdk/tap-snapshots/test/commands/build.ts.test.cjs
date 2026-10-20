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
  "query": ":scripts:not(:built):not(:malware)",
  "success": Array [],
}
`

exports[`test/commands/build.ts > TAP > usage > should return usage information 1`] = `
Usage:
  vlt build [<query>]
  vlt build --target=<query>

Build the installed packages that need it: run their lifecycle scripts and link
their bins. Only does work that is actually needed.

Sets, saves and applies \`allow-scripts\`: builds what the query selects. With no
query: the stored one, or \`:scripts:not(:built):not(:malware)\`. Asks before
replacing or editing a stored query (-y skips). Saves to the project vlt.json,
or the user one with --config=user. With nothing stored, no TTY and no -y:
builds the default without saving it.

Installs run the scripts it selects. Built packages stay built.

  Aliases

    ​b

  Options

    target
      Query to build instead of allow-scripts. Wins over the query; never saved.

      ​--target=<query>

    allow-scripts
      Same as the query argument.

      ​--allow-scripts=<query>

    yes
      Skip the prompts: replace or keep the stored allow-scripts without asking.

      ​--yes

    config
      vlt.json to save allow-scripts to (default: project).

      ​--config=user|project

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
