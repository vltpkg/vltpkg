/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/repo.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt repo [<spec>]
vlt repo [--target=<query>]
\`\`\`

Open repository page for a package in a web browser. Reads repository information from package.json or fetches manifest data for the specified package.

## Examples

Open repo for the current package (reads local package.json)

\`\`\`
vlt repo
\`\`\`

Open repo for a specific package version

\`\`\`
vlt repo abbrev@2.0.0
\`\`\`

List repository URLs for all direct dependencies

\`\`\`
vlt repo --target=":root > *"
\`\`\`

## Options

### target

Query selector to filter packages using DSS syntax.

\`\`\`
--target=<query>
\`\`\`

`
