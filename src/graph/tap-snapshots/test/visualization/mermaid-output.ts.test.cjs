/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
flowchart TD
file%3A%2F%2F%2Fgraph%2Fmy-project(file://{CWD}/my-project)
file%3A%2F%2F%2Fgraph%2Fmy-project(file://{CWD}/my-project) -->|prod| foo%401.0.0(foo@1.0.0)
foo%401.0.0(foo@1.0.0)
file%3A%2F%2F%2Fgraph%2Fmy-project(file://{CWD}/my-project) -->|prod| bar%401.0.0(bar@1.0.0)
bar%401.0.0(bar@1.0.0)
bar%401.0.0(bar@1.0.0) -->|prod| baz%401.0.0(baz@1.0.0)
baz%401.0.0(baz@1.0.0)
baz%401.0.0(baz@1.0.0) -->|prod| foo%401.0.0(foo@1.0.0)

file%3A%2F%2F%2Fgraph%2Fmy-project(file://{CWD}/my-project) -->|prod| missing-0(Missing package: missing@^1.0.0)

`
