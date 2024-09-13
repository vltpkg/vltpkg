/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print mermaid output 1`] = `
flowchart TD
file%C2%B7.(file·.)
file%C2%B7.(file·.) -->|prod| %C2%B7%C2%B7foo%401.0.0(··foo@1.0.0)
%C2%B7%C2%B7foo%401.0.0(··foo@1.0.0)
file%C2%B7.(file·.) -->|prod| %C2%B7%C2%B7bar%401.0.0(··bar@1.0.0)
%C2%B7%C2%B7bar%401.0.0(··bar@1.0.0)
%C2%B7%C2%B7bar%401.0.0(··bar@1.0.0) -->|prod| %C2%B7%C2%B7baz%401.0.0(··baz@1.0.0)
%C2%B7%C2%B7baz%401.0.0(··baz@1.0.0)
%C2%B7%C2%B7baz%401.0.0(··baz@1.0.0) -->|prod| %C2%B7%C2%B7foo%401.0.0(··foo@1.0.0)

file%C2%B7.(file·.) -->|prod| missing-0(Missing package: missing@^1.0.0)

`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces > should print workspaces mermaid output 1`] = `
flowchart TD
file%C2%B7.(file·.)
workspace%C2%B7packages%252Fb(workspace·packages%2Fb)
workspace%C2%B7packages%252Fa(workspace·packages%2Fa)
`
