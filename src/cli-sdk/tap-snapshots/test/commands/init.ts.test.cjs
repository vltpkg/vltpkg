/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/init.ts > TAP > human output > must match snapshot 1`] = `
Wrote manifest to /some/path:

{
  "name": "myproject"
}

Modify/add properties using \`vlt pkg\`. For example:

  vlt pkg set "description=My new project"
`

exports[`test/commands/init.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt init
\`\`\`

Create a new package.json file in the current directory.

`

exports[`test/commands/init.ts > TAP > test command with workspace > should add workspace to vlt.json 1`] = `
{
  "workspaces": {
    "packages": [
      "packages/a"
    ]
  }
}

`

exports[`test/commands/init.ts > TAP > test command with workspace > should output human readable message 1`] = `
Wrote manifest to packages/a:

Modify/add properties using \`vlt pkg\`. For example:

  vlt pkg set "description=My new project"
`
