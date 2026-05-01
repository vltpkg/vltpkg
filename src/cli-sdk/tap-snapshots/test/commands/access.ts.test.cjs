/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/access.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt access <command> [<args>]
\`\`\`

Set or get access levels for published packages and manage team-based package permissions.

## Subcommands

### list packages

List packages with access info for a scope, user, or org.

\`\`\`
vlt access list packages [<scope|user|org>]
\`\`\`

### get status

Get the access/visibility status of a package.

\`\`\`
vlt access get status <package>
\`\`\`

### set status

Set the access/visibility of a package. Use --access to specify the level.

\`\`\`
vlt access set status <package>
\`\`\`

### grant

Grant access to a scope:team for a package.

\`\`\`
vlt access grant <read-only|read-write> <scope:team> [<package>]
\`\`\`

### revoke

Revoke access from a scope:team for a package.

\`\`\`
vlt access revoke <scope:team> [<package>]
\`\`\`

## Options

### registry

Registry URL to manage access on.

\`\`\`
--registry=<url>
\`\`\`

### otp

Provide an OTP for access changes.

\`\`\`
--otp=<otp>
\`\`\`

`
