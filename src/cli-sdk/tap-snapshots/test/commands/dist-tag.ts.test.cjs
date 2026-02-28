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
vlt dist-tag add <package>@<version> <tag>
vlt dist-tag rm <package> <tag>
vlt dist-tag ls [<package>]
\`\`\`

Manage distribution tags for packages in the registry.  
Distribution tags (dist-tags) are human-readable labels that can be used to organize and label different versions of packages published to the registry.  
Subcommands: add Add or update a dist-tag to point to a specific version rm Remove a dist-tag from a package ls List all dist-tags for a package

## Options

### registry

Registry URL to manage dist-tags in.

\`\`\`
--registry=<url>
\`\`\`

### identity

Identity namespace used to look up auth tokens.

\`\`\`
--identity=<name>
\`\`\`

`
