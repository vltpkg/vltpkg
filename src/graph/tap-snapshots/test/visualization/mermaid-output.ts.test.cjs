/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
flowchart TD
0(my-project@1.0.0)
0 -->|prod| 1(foo@1.0.0)
1(foo@1.0.0)
0 -->|prod| 2(bar@1.0.0)
2(bar@1.0.0)
2 -->|prod| 3(baz@1.0.0)
3(baz@1.0.0)
3 -->|prod| 1(foo@1.0.0)

0 -->|prod| missing-0(Missing package: missing@^1.0.0)

`
