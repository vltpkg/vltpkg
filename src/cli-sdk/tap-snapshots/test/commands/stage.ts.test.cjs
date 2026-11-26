/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/stage.ts > TAP > usage > must match snapshot 1`] = `
Usage:
  vlt stage publish
  vlt stage list [<pkg>]
  vlt stage view <stage-id>
  vlt stage approve <stage-id>
  vlt stage reject <stage-id>
  vlt stage download <stage-id>

Stage a package version for a person to approve.

A staged version is uploaded to the registry but not served until a person
approves it with a second factor. Staging never asks for one, so a CI workflow
can stage and a maintainer approves. Approving publishes the version, rejecting
deletes it.

The registry must support staged publishing. Every subcommand uses the
\`publishConfig.registry\` of the package in the current directory if set, else
the configured registry.

  Subcommands

    publish
      Pack and stage the package. Takes the same options as \`vlt publish\`.

      ​vlt stage publish

    list
      List the staged versions in the registry, or those of one package. Alias:
      \`ls\`.

      ​vlt stage list [<pkg>]

    view
      Show a staged version.

      ​vlt stage view <stage-id>

    approve
      Publish a staged version. Needs a second factor.

      ​vlt stage approve <stage-id>

    reject
      Delete a staged version and its tarball. Needs a second factor.

      ​vlt stage reject <stage-id>

    download
      Save the staged tarball in the current directory.

      ​vlt stage download <stage-id>

  Options

    otp
      One-time password to approve or reject a staged version with.

      ​--otp=<otp>

`
