/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/trust.ts > TAP > usage > must match snapshot 1`] = `
Usage:
  vlt trust list [<pkg>]
  vlt trust revoke [<pkg>] --id=<trust-id>

Manage the CI workflows trusted to publish a package.

A trusted publisher is a CI workflow the registry lets publish a package with no
stored token: the job swaps its identity token for a short-lived registry token.

\`<pkg>\` defaults to the package in the current directory. The registry is the
\`publishConfig.registry\` of the package in the current directory when that
package is \`<pkg>\`, else the configured registry.

  Subcommands

    list
      List the trusted publishers of a package. Alias: \`ls\`.

      ​vlt trust list [<pkg>]

    revoke
      Remove a trusted publisher. Needs a second factor.

      ​vlt trust revoke [<pkg>] --id=<trust-id>

  Options

    id
      Id of the trusted publisher to revoke, as \`vlt trust list\` prints it.

      ​--id=<trust-id>

    dry-run
      Show what would be revoked without revoking it.

      ​--dry-run

    otp
      One-time password to revoke a trusted publisher with.

      ​--otp=<otp>

`

exports[`test/commands/trust.ts > TAP > views > dry run 1`] = `
Would revoke trusted publisher 3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b of @acme/pkg (dry run).
`

exports[`test/commands/trust.ts > TAP > views > list 1`] = `
type: github
id: 3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b
file: release.yml
repository: acme/utils
environment: production
permissions: publish, stage publish

type: github
file: ci.yaml
permissions: other

id: 3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b
`

exports[`test/commands/trust.ts > TAP > views > none 1`] = `
No trusted publishers found.
`

exports[`test/commands/trust.ts > TAP > views > revoked 1`] = `
Revoked trusted publisher 3f2a1c9e-8b7d-4e6f-9a0b-1c2d3e4f5a6b of @acme/pkg.
`
