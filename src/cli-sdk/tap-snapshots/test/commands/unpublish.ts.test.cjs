/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/unpublish.ts > TAP > usage > must match snapshot 1`] = `
Usage:
  vlt unpublish <package>@<version>
  vlt unpublish <package> --force

Remove a package version from the registry.

To unpublish a single version, specify the package name and version. To
unpublish an entire package, specify the package name and use --force.

⚠️ Unpublishing is a destructive action that cannot be undone. Consider using
\`vlt deprecate\` instead if you want to discourage usage of a package without
removing it.

  Examples

    Unpublish a specific version

    ​vlt unpublish my-package@1.0.0

    Unpublish a specific version of a scoped package

    ​vlt unpublish @scope/my-package@1.0.0

    Unpublish an entire package (requires --force)

    ​vlt unpublish my-package --force

  Options

    force
      Required to unpublish an entire package (all versions).

      ​--force

    otp
      Provide a one-time password for authentication.

      ​--otp=<otp>

`
