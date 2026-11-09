/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/deploy.ts > TAP > usage > must match snapshot 1`] = `
Usage:
  vlt deploy <target-dir>

Copy a workspace, or a project without workspaces, and its production
dependencies into a standalone folder, ready to ship (for example in a Docker
image).

The package's files are copied the same way 'vlt pack' selects them. Workspaces
it depends on are copied too, as real folders inside the target, so nothing
links back to the project. Dependencies are installed from the project's
vlt-lock.json, so the target gets the exact versions the project uses.

devDependencies are left out. Like install, it runs no lifecycle scripts unless
they are allowed with the --allow-scripts option.

  Examples

    Deploy the src/app workspace to ./dist/app

    ​vlt deploy -w src/app ./dist/app

    From inside a workspace folder, deploy that workspace

    ​vlt deploy ../app-deploy

  Options

    workspace
      The workspace to deploy.

      ​--workspace=<path|glob>

    workspace-group
      Deploy the workspace in this group. The group must select exactly one
      workspace.

      ​--workspace-group=<name>

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

    force
      Remove the contents of the target folder if it is not empty.

      ​--force

`

exports[`test/commands/deploy.ts > TAP > views > human 1`] = `
📦 Deployed app@1.0.0 to /out
📚 3 dependencies installed
🔗 2 workspaces copied: lib, tool
🔨 1 package needs to be built, run "vlt build" in /out to complete the deploy.
`

exports[`test/commands/deploy.ts > TAP > views > human, no workspaces 1`] = `
📦 Deployed package to /out
📚 3 dependencies installed
`

exports[`test/commands/deploy.ts > TAP > views > human, one workspace, no name 1`] = `
📦 Deployed package to /out
📚 3 dependencies installed
🔗 1 workspace copied: lib
`

exports[`test/commands/deploy.ts > TAP > views > human, two packages to build 1`] = `
📦 Deployed package to /out
📚 3 dependencies installed
🔨 2 packages need to be built, run "vlt build" in /out to complete the deploy.
`
