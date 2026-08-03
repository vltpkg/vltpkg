/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/registry.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt registry <alias> <command> [<args>]
\`\`\`

Run an account command against a specific configured registry, selected by its \`registries\` alias instead of a full URL.

For example, \`vlt registry main whoami\` runs \`whoami\` against the registry configured as \`main\`. Omit the alias (e.g. \`vlt registry whoami\`) to be prompted to choose from the configured registries, or to fall back to \`--default-registry-alias\` when non-interactive.

\`<command>\` is one of: whoami, logout, login, token, access, publish, unpublish, deprecate, dist-tag, profile, ping.

`
