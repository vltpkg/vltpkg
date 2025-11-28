/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/bugs.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt bugs [<spec>]
vlt bugs [--target=<query>]
\`\`\`

Open bug tracker for a package in a web browser. Reads bug tracker information from package.json or fetches manifest data for the specified package.

## Examples

Open bugs for the current package (reads local package.json)

\`\`\`
vlt bugs
\`\`\`

Open bugs for a specific package version

\`\`\`
vlt bugs abbrev@2.0.0
\`\`\`

List bug tracker URLs for all direct dependencies

\`\`\`
vlt bugs --target=":root > *"
\`\`\`

## Options

### target

Query selector to filter packages using DSS syntax.

\`\`\`
--target=<query>
\`\`\`

`
