/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/outdated.ts > TAP > command > default report > rendered default report 1`] = `
Package  Current  Wanted  Latest  Type                  Depended By
anon     1.0.0    1.0.0   2.0.0   dependencies          file;.
bar      1.0.0    1.0.0   1.2.0   devDependencies       my-project
baz      1.0.0    1.0.0   -       peerDependencies      bar
foo      1.0.0    1.5.0   2.0.0   dependencies          my-project
nover    MISSING  1.0.0   1.0.0   peerDependencies      my-project
qux      1.0.0    1.0.1   1.0.1   optionalDependencies  bar
qux      1.0.0    1.0.1   1.0.1   optionalDependencies  my-project

7 outdated packages found.
`

exports[`test/commands/outdated.ts > TAP > human view > renders a table with colors 1`] = `
[1m[4mPackage[24m[22m  [1m[4mCurrent[24m[22m  [1m[4mWanted[24m[22m  [1m[4mLatest[24m[22m  [1m[4mType[24m[22m                  [1m[4mDepended By[24m[22m
[33mbar[39m      [2m1.0.0[22m    [2m1.0.0[22m   1.[36m2.0[39m   [2mdevDependencies[22m       my-project
[33mbaz[39m      [2m1.0.0[22m    [2m1.0.0[22m   [2m-[22m       [2mpeerDependencies[22m      bar
[31mfoo[39m      [2m1.0.0[22m    1.[36m5.0[39m   [31m2.0.0[39m   [2mdependencies[22m          my-project
[33mnover[39m    [2mMISSING[22m  1.0.0   1.0.0   [2mpeerDependencies[22m      my-project
[33mqux[39m      [2m1.0.0[22m    1.0.0   1.0.[32m1[39m   [2moptionalDependencies[22m  my-project
[33munknown[39m  [2mMISSING[22m  [2m-[22m       [2m-[22m       [2mdependencies[22m          my-project

[2m6 outdated packages found.[22m
`

exports[`test/commands/outdated.ts > TAP > human view > renders a table without colors 1`] = `
Package  Current  Wanted  Latest  Type                  Depended By
bar      1.0.0    1.0.0   1.2.0   devDependencies       my-project
baz      1.0.0    1.0.0   -       peerDependencies      bar
foo      1.0.0    1.5.0   2.0.0   dependencies          my-project
nover    MISSING  1.0.0   1.0.0   peerDependencies      my-project
qux      1.0.0    1.0.0   1.0.1   optionalDependencies  my-project
unknown  MISSING  -       -       dependencies          my-project

6 outdated packages found.
`

exports[`test/commands/outdated.ts > TAP > human view > uses singular wording for a single package 1`] = `
Package  Current  Wanted  Latest  Type          Depended By
foo      1.0.0    1.5.0   2.0.0   dependencies  my-project

1 outdated package found.
`

exports[`test/commands/outdated.ts > TAP > usage > should have usage 1`] = `
Usage:
  vlt outdated
  vlt outdated [package-names...]
  vlt outdated [<query>]

Display a table of installed dependencies that have newer versions available in
the registry.

Under the hood this uses the vlt Dependency Selector Syntax (the same engine
that powers \`vlt query\`) with the \`:outdated\` pseudo-selector. A registry
request is made for each candidate package to determine the "wanted" (highest
version matching the declared range) and "latest" (the \`latest\` dist-tag)
versions.

Provide package names as positional arguments to limit the report to those
packages. Alternatively, pass a DSS query selector to scope the report to an
arbitrary subset of the dependency graph.

Defaults to checking every dependency of the project and its workspaces.

  Aliases

    ​out

  Examples

    Show all outdated dependencies

    ​vlt outdated

    Only check the 'foo' and 'bar' packages

    ​vlt outdated foo bar

    Only check direct dependencies of the project root

    ​vlt outdated :root > *

    Output the results as JSON

    ​vlt outdated --view=json

  Options

    view
      Output format. Defaults to human-readable or json if no tty.

      ​--view=[human | json]

`
