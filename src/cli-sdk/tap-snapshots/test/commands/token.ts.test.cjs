/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/token.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt token list
vlt token add
vlt token rm
\`\`\`

Manage registry authentication tokens in the vlt keychain.

## Subcommands

### list

List all tokens for configured registries. Queries each registry's token API and displays token metadata including key, creation date, and permissions.

\`\`\`
vlt token list
\`\`\`

### add

Add a token for the specified registry. You will be prompted to paste the bearer token.

\`\`\`
vlt token add
\`\`\`

### rm

Remove the stored token for the specified registry.

\`\`\`
vlt token rm
\`\`\`

## Options

### registry

Registry URL to manage tokens for.

\`\`\`
--registry=<url>
\`\`\`

### registries

Named registry aliases (used by the list subcommand).

\`\`\`
--registries=<alias=url>
\`\`\`

### identity

Identity namespace used to store auth tokens.

\`\`\`
--identity=<name>
\`\`\`

`
