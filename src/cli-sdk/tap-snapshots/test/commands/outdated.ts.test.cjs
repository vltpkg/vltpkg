/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/outdated.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt outdated
vlt outdated [package-names...]
vlt outdated [--workspace=<path>] [--view=human | json | count]
\`\`\`

List direct dependencies that have newer versions available.

For every registry dependency of the project root and its workspaces, compare the installed version against the highest version that satisfies the range in \`package.json\` (wanted) and against the registry's \`latest\` dist-tag (latest). Only dependencies that are missing or behind on either count are reported.

Package names given as positional arguments restrict the report to those dependencies. The --workspace and --workspace-group options restrict it to the given workspaces.

The installed versions come from the graph built by \`vlt install\`, so the project must be installed by vlt first.

Dependencies that do not resolve against a registry (git, file, remote tarball or workspace specs) are not checked. Catalog specs are checked against the range the catalog resolves them to.

## Examples

Report outdated dependencies of the project and all its workspaces

\`\`\`
vlt outdated
\`\`\`

Only check the dependencies named 'react' and 'react-dom'

\`\`\`
vlt outdated react react-dom
\`\`\`

Only check the dependencies of a single workspace

\`\`\`
vlt outdated --workspace=packages/app
\`\`\`

Print the report as JSON

\`\`\`
vlt outdated --view=json
\`\`\`

## Options

### workspace

Limit the report to the dependencies of the given workspace(s).

\`\`\`
--workspace=<path>
\`\`\`

### workspace-group

Limit the report to the dependencies of the workspaces in the given group(s).

\`\`\`
--workspace-group=<name>
\`\`\`

### view

Output format. Defaults to human-readable or json if no tty. Count outputs the number of outdated dependencies.

\`\`\`
--view=[human | json | count]
\`\`\`

`

exports[`test/commands/outdated.ts > TAP > reports outdated direct dependencies > result 1`] = `
Array [
  Object {
    "current": "1.0.0",
    "dependent": "my-project",
    "latest": "2.0.0",
    "location": ".",
    "name": "foo",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
  Object {
    "current": undefined,
    "dependent": "my-project",
    "latest": "1.0.0",
    "location": ".",
    "name": "missing",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.0.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "my-project",
    "latest": "1.5.0",
    "location": ".",
    "name": "notag",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.5.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "my-project",
    "latest": "1.1.0",
    "location": ".",
    "name": "baz",
    "spec": "custom:baz@^1.0.0",
    "type": "prod",
    "wanted": "1.1.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "my-project",
    "latest": "1.1.0",
    "location": ".",
    "name": "pinned",
    "spec": "1.0.0",
    "type": "dev",
    "wanted": "1.0.0",
  },
  Object {
    "current": "1.0.0",
    "dependent": "a",
    "latest": "2.0.0",
    "location": "./packages/a",
    "name": "foo",
    "spec": "^1.0.0",
    "type": "prod",
    "wanted": "1.2.0",
  },
]
`

exports[`test/commands/outdated.ts > TAP > views > human view with a single dependent 1`] = `
Package  Current  Wanted  Latest  Type
foo      1.0.0    1.2.0   2.0.0   prod
`

exports[`test/commands/outdated.ts > TAP > views > human view with nothing outdated 1`] = `
All dependencies are up to date.
`

exports[`test/commands/outdated.ts > TAP > views > human view with several dependents 1`] = `
Package  Current  Wanted  Latest  Type  Dependent
foo      1.0.0    1.2.0   2.0.0   prod  my-project
missing  missing  1.0.0   1.0.0   prod  my-project
pinned   1.0.0    1.0.0   1.1.0   dev   my-project
foo      1.0.0    1.2.0   2.0.0   prod  a
`
