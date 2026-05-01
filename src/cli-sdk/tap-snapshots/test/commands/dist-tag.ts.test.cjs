/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/dist-tag.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt dist-tag add <pkg>@<version> [<tag>]
vlt dist-tag rm <pkg> <tag>
vlt dist-tag ls [<pkg>]
\`\`\`

Manage distribution tags for a package.

Distribution tags (dist-tags) provide aliases for package versions, allowing users to install specific versions using tag names instead of version numbers. The most common tag is \`latest\`, which is used by default when no tag is specified during install.

## Subcommands

### add

Tag the specified version of a package with the given tag, or "latest" if unspecified.

\`\`\`
vlt dist-tag add <pkg>@<version> [<tag>]
\`\`\`

### rm

Remove a dist-tag from a package.

\`\`\`
vlt dist-tag rm <pkg> <tag>
\`\`\`

### ls

List all dist-tags for a package, defaulting to the package in the current directory.

\`\`\`
vlt dist-tag ls [<pkg>]
\`\`\`

## Options

### registry

Registry URL to manage dist-tags for.

\`\`\`
--registry=<url>
\`\`\`

### identity

Identity namespace used to look up auth tokens.

\`\`\`
--identity=<name>
\`\`\`

`
