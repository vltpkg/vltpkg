/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print mermaid output 1`] = `
flowchart TD
file%3B.(file;.)
file%3B.(file;.) -->|prod| %3B%3Bfoo%401.0.0(;;foo@1.0.0)
%3B%3Bfoo%401.0.0(;;foo@1.0.0)
file%3B.(file;.) -->|prod| %3B%3Bbar%401.0.0(;;bar@1.0.0)
%3B%3Bbar%401.0.0(;;bar@1.0.0)
%3B%3Bbar%401.0.0(;;bar@1.0.0) -->|prod| %3B%3Bbaz%401.0.0(;;baz@1.0.0)
%3B%3Bbaz%401.0.0(;;baz@1.0.0)
%3B%3Bbaz%401.0.0(;;baz@1.0.0) -->|prod| %3B%3Bfoo%401.0.0(;;foo@1.0.0)

file%3B.(file;.) -->|prod| missing-0(Missing package: missing@^1.0.0)

`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces > should print workspaces mermaid output 1`] = `
flowchart TD
file%3B.(file;.)
workspace%3Bpackages%252Fb(workspace;packages%2Fb)
workspace%3Bpackages%252Fa(workspace;packages%2Fa)
`
