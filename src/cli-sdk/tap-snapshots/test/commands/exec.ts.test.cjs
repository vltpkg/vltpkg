/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/exec.ts > TAP > promptFn > must match snapshot 1`] = `
About to install: a@1.2.3
from: https://registry.npmjs.org/a/a-1.2.3.tgz
into: /some/path
Is this ok? (y) 
`

exports[`test/commands/exec.ts > TAP > usage > usage 1`] = `
Usage:
  vlt exec [--package=<pkg>] [command...]

Run a command defined by a package, installing it if necessary.

If the package specifier is provided explicitly via the \`--package\` config, then
that is what will be used. If a satisfying instance of the named package exists
in the local \`node_mnodules\` folder, then that will be used.

If \`--package\` is not set, then vlt will attempt to infer the package to be
installed if necessary, in the following manner:

- If the first argument is an executable found in the \`node_modules/.bin\` folder
(ie, provided by an installed direct dependency), then that will be used. The
search stops, and nothing will be installed.
- Otherwise, vlt attempts to resolve the first argument as if it was a
\`--package\` option, and then swap it out with the "default" executable provided
by that package.

The "default" executable provided by a package is:

- If the package provides a single executable string in the \`bin\` field, then
that is the executable to use.
- Otherwise, if there is a \`bin\` with the same name as the package (or just the
portion after the \`/\` in the case of scoped packages), then that will be used.

If the appropriate excutable cannot be determined, then an error will be raised.

At no point will \`vlt exec\` change the locally installed dependencies. Any
installs it performs is done in vlt's XDG data directory.

  Aliases

    ​x

  Examples

    Run tsc provided by typescript version 5

    ​vlt exec --package typescript@5 tsc

    Run the default bin provided by eslint

    ​vlt exec eslint src/file.js

    Run the default bin provided by eslint version 9.24

    ​vlt exec eslint@9.24 src/file.js

  Options

    package
      Explicitly set the package to search for bins.

      ​--package=<specifier>

    allow-scripts
      Filter which packages are allowed to run lifecycle scripts using DSS query
      syntax.

      ​--allow-scripts=<query>

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

`
