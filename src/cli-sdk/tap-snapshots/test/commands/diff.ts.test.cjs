/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/diff.ts > TAP > usage > usage 1`] = `
Usage:
  vlt diff <command> [flags]

Show what changed between two states of a project.

Only the \`lockfile\` subcommand is implemented. Bare \`vlt diff\`, along with the
npm-compatible \`--diff=<spec>\` grammar for diffing package contents, is reserved
and not yet available.

  Subcommands

    lockfile
      Diff the dependency graph recorded in vlt-lock.json between two git refs,
      or between a ref and the working tree. Either ref may instead be a path
      ending in \`.json\`, to diff against a lockfile on disk.

      With no refs, compares the working tree against HEAD. With one, compares
      the working tree against it. With two, compares them to each other; \`a..b\`
      means the same as \`a b\`.

      ​vlt diff lockfile [<ref>] [<ref>]

  Examples

    Compare the working tree lockfile against HEAD

    ​vlt diff lockfile

    Compare the working tree against main

    ​vlt diff lockfile main

    Compare two refs; \`main..feat/x\` means the same

    ​vlt diff lockfile main feat/x

    Compare a lockfile on disk against the working tree

    ​vlt diff lockfile --base=./old/vlt-lock.json

    Print the diff as JSON. This is the stable contract other tools should build
    against.

    ​vlt diff lockfile origin/main --view=json

    Exit 1 when anything changed, for use in CI

    ​vlt diff lockfile origin/main --exit-code

`

exports[`test/commands/diff.ts > TAP > usage > usage markdown 1`] = `
Usage:

\`\`\`
vlt diff <command> [flags]
\`\`\`

Show what changed between two states of a project.

Only the \`lockfile\` subcommand is implemented. Bare \`vlt diff\`, along with the npm-compatible \`--diff=<spec>\` grammar for diffing package contents, is reserved and not yet available.

## Subcommands

### lockfile

Diff the dependency graph recorded in vlt-lock.json between two git refs, or between a ref and the working tree. Either ref may instead be a path ending in \`.json\`, to diff against a lockfile on disk.

With no refs, compares the working tree against HEAD. With one, compares the working tree against it. With two, compares them to each other; \`a..b\` means the same as \`a b\`.

\`\`\`
vlt diff lockfile [<ref>] [<ref>]
\`\`\`

## Examples

Compare the working tree lockfile against HEAD

\`\`\`
vlt diff lockfile
\`\`\`

Compare the working tree against main

\`\`\`
vlt diff lockfile main
\`\`\`

Compare two refs; \`main..feat/x\` means the same

\`\`\`
vlt diff lockfile main feat/x
\`\`\`

Compare a lockfile on disk against the working tree

\`\`\`
vlt diff lockfile --base=./old/vlt-lock.json
\`\`\`

Print the diff as JSON. This is the stable contract other tools should build against.

\`\`\`
vlt diff lockfile origin/main --view=json
\`\`\`

Exit 1 when anything changed, for use in CI

\`\`\`
vlt diff lockfile origin/main --exit-code
\`\`\`

`
