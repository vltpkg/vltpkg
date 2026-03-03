/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/view.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt view <pkg>[@<version>] [<field>]
vlt view <pkg>[@<version>] [--view=human | json]
\`\`\`

View registry information about a package.

Fetches and displays packument and manifest data for a given package from the registry.

When a specific field is provided, only that field value is displayed. Use dot-prop syntax to access nested fields (e.g., \`dist-tags.latest\`, \`dependencies.lodash\`).

Security data from the vlt security archive is shown when available, including scores and alerts.

## Aliases

\`\`\`
info, show
\`\`\`

## Examples

View info about the latest version of express

\`\`\`
vlt view express
\`\`\`

View info about a specific version

\`\`\`
vlt view express@4.18.2
\`\`\`

List all published versions

\`\`\`
vlt view express versions
\`\`\`

Show all dist-tags

\`\`\`
vlt view express dist-tags
\`\`\`

Show dependencies of the latest version

\`\`\`
vlt view express dependencies
\`\`\`

Show the latest dist-tag value

\`\`\`
vlt view express dist-tags.latest
\`\`\`

## Options

### view

Output format. Defaults to human-readable or json if no tty.

\`\`\`
--view=[human | json]
\`\`\`

`
