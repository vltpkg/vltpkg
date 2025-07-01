/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/publish.ts > TAP > usage > must match snapshot 1`] = `
Usage:
  vlt publish

Create a tarball from a package and publish it to the configured registry.
This command will pack the package in the current directory or specified folder,
and then upload it to the configured registry.

  Options

    tag
      Publish the package with the given tag

      ​--tag=<tag>

    access
      Set access level (public or restricted)

      ​--access=<level>

    otp
      Provide an OTP to use when publishing a package.

      ​--otp=<otp>

`
