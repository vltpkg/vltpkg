/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/profile.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt profile <command> [<args>]
\`\`\`

Get or set profile properties for the authenticated user on the configured registry.

## Subcommands

### get

Display profile information. Optionally pass a property name to get a single value.

\`\`\`
vlt profile get [<property>]
\`\`\`

### set

Set a profile property to the given value.

\`\`\`
vlt profile set <property> <value>
\`\`\`

## Options

### registry

Registry URL to query for profile info.

\`\`\`
--registry=<url>
\`\`\`

### identity

Identity namespace used to look up auth tokens.

\`\`\`
--identity=<name>
\`\`\`

### otp

Provide an OTP to use when updating profile properties.

\`\`\`
--otp=<otp>
\`\`\`

`
