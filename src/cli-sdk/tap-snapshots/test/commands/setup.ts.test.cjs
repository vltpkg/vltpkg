/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/setup.ts > TAP > usage > must match snapshot 1`] = `
Usage:

\`\`\`
vlt setup [<account>]
\`\`\`

Configure the registry aliases for your vlt.io account so that \`vlt install\` and \`vlx\` work out of the box.

Sign up or log in at https://www.vlt.io first. The wizard authenticates against your account and writes the \`npm\` and \`main\` registry aliases (and any additional aliases you add) to your user \`vlt.json\`.

## Options

### config

Which config file to write to. Defaults to \`user\`; pass \`--config=project\` to write to the project \`vlt.json\`.

\`\`\`
--config=<user | project>
\`\`\`

### registries

Additional registry aliases to stage non-interactively. Combine with \`--yes\` to run setup unattended.

\`\`\`
--registries=<name=url>
\`\`\`

### yes

Skip interactive prompts (requires <account> and does not open a browser for authentication).

\`\`\`
--yes
\`\`\`

`
