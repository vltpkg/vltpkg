/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/fund.ts > TAP > fund > should have usage 1`] = `
Usage:
  vlt fund
  vlt fund [package-names...]
  vlt fund [<query>]

Display a list of installed dependencies that declare funding information, along
with the URLs where they can be funded.

Under the hood this uses the vlt Dependency Selector Syntax (the same engine
that powers \`vlt query\`) to collect installed dependencies, then reports the
ones whose \`package.json\` includes a \`funding\` field.

Provide package names as positional arguments to limit the report to those
packages. Alternatively, pass a DSS query selector to scope the report to an
arbitrary subset of the dependency graph.

Defaults to checking every dependency of the project and its workspaces.

  Examples

    List all dependencies looking for funding

    ​vlt fund

    Only check the 'foo' and 'bar' packages

    ​vlt fund foo bar

    Only check direct dependencies of the project root

    ​vlt fund :root > *

    Output the results as JSON

    ​vlt fund --view=json

  Options

    view
      Output format. Defaults to human-readable or json if no tty.

      ​--view=[human | json]

`

exports[`test/commands/fund.ts > TAP > fund > should list funded pkgs in human readable format 1`] = `
3 packages are looking for funding

https://github.com/sponsors/bar
  bar@2.0.0

https://opencollective.com/foo
  baz@3.0.0
  foo@1.0.0

https://patreon.com/baz
  baz@3.0.0
`

exports[`test/commands/fund.ts > TAP > fund > should list funded pkgs in json format 1`] = `
[
  {
    "name": "bar",
    "version": "2.0.0",
    "funding": [
      {
        "url": "https://github.com/sponsors/bar",
        "type": "github"
      }
    ]
  },
  {
    "name": "baz",
    "version": "3.0.0",
    "funding": [
      {
        "url": "https://opencollective.com/foo",
        "type": "opencollective"
      },
      {
        "url": "https://patreon.com/baz",
        "type": "patreon"
      }
    ]
  },
  {
    "name": "foo",
    "version": "1.0.0",
    "funding": [
      {
        "url": "https://opencollective.com/foo",
        "type": "opencollective"
      }
    ]
  }
]
`

exports[`test/commands/fund.ts > TAP > fund > should scope report to named packages 1`] = `
1 package is looking for funding

https://opencollective.com/foo
  foo@1.0.0
`

exports[`test/commands/fund.ts > TAP > fund > should use colors when set in human readable format 1`] = `
[1m3 packages are looking for funding[22m

[36mhttps://github.com/sponsors/bar[39m
  bar@2.0.0

[36mhttps://opencollective.com/foo[39m
  baz@3.0.0
  foo@1.0.0

[36mhttps://patreon.com/baz[39m
  baz@3.0.0
`

exports[`test/commands/fund.ts > TAP > no funded dependencies > should report that no funding was found 1`] = `
No funding information found for any installed dependency.
`
