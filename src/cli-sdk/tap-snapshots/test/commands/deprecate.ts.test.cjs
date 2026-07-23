/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/deprecate.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt deprecate <pkg>[@<version>] <message>
\`\`\`

Update the npm registry entry for a package, providing a deprecation warning to all who attempt to install it.

It works on version ranges as well as specific versions, so you can un-deprecate a previously deprecated package by specifying the version range with an empty string as the message.

## Examples

Deprecate all versions of a package

\`\`\`
vlt deprecate my-package "this package is no longer maintained"
\`\`\`

Deprecate specific versions

\`\`\`
vlt deprecate my-package@"<0.2.0" "critical bug, please update"
\`\`\`

Un-deprecate a package

\`\`\`
vlt deprecate my-package ""
\`\`\`

## Options

### registry

The registry to update.

\`\`\`
--registry=<url>
\`\`\`

### otp

Provide an OTP to use when deprecating a package.

\`\`\`
--otp=<otp>
\`\`\`

`
