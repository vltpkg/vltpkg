/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/ping.ts > TAP > must match snapshot 1`] = `
Usage:

\`\`\`
vlt ping
vlt ping [<registry-alias>]
\`\`\`

Ping configured registries to verify connectivity and check registry health.

By default, pings all configured registries including the default registry.

If a registry alias is provided, ping only that specific registry. Registry aliases are configured via the \`registries\` field in vlt.json or with the \`--registries\` option.

`
