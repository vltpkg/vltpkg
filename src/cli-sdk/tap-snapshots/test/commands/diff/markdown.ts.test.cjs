/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/commands/diff/markdown.ts > TAP > renders a report worth pasting into a review > markdown 1`] = `
## Lockfile diff

\`main\` → \`feat/x\`

**+50** packages · **-20** edges · 4 changes · 7 hidden

### Major versions

| Package | From | To | Reaches |
| --- | --- | --- | --- |
| \`yargs\` | \`17.7.3\` | \`18.1.0\` | www/docs |

### Downgraded

| Package | From | To | Reaches |
| --- | --- | --- | --- |
| \`beta\` | \`2.0.0\` | \`1.9.0\` | www/docs |

### Removed

| Package | From | To | Reaches |
| --- | --- | --- | --- |
| \`require-directory\` | \`2.1.1\` |  | www/docs |

### Workspaces

<details><summary><b>www/docs</b> — 4 changes in 3 trees</summary>

\`\`\`
^^ yargs  17.7.3 → 18.1.0
└─ ^ alpha  1.0.0 → 1.0.1
v beta  2.0.0 → 1.9.0
- require-directory  2.1.1
\`\`\`

</details>

`
