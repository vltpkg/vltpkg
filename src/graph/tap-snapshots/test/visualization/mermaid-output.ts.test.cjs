/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > actual graph > highlight selection > should print selected packages with highlight 1`] = `
flowchart TD
a("root:my-project")
a -->|"bar#64;^1.0.0 (optional)"| g("npm:bar#64;1.0.0")
g -->|"baz#64;custom:baz#64;^1.0.0"| m("custom:baz#64;1.0.0"):::a
classDef a fill:gold,color:#242424
`

exports[`test/visualization/mermaid-output.ts > TAP > actual graph > selected packages > should print selected packages 1`] = `
flowchart TD
a("root:my-project")
a -->|"bar#64;^1.0.0 (optional)"| g("npm:bar#64;1.0.0")
g -->|"baz#64;custom:baz#64;^1.0.0"| m("custom:baz#64;1.0.0")
`

exports[`test/visualization/mermaid-output.ts > TAP > actual graph > should print from an actual loaded graph 1`] = `
flowchart TD
a("root:my-project")
a -->|"link#64;file:./linked"| d("file(linked):linked#64;1.0.0")
a -->|"foo#64;^1.0.0"| e("npm:foo#64;1.0.0")
a -->|"extraneous#64;*"| f("npm:extraneous#64;1.0.0")
a -->|"bar#64;^1.0.0 (optional)"| g("npm:bar#64;1.0.0")
g -->|"blooo#64;1"| l("npm:blooo#64;1.0.0")
g -->|"baz#64;custom:baz#64;^1.0.0"| m("custom:baz#64;1.0.0")
a -->|"aliased#64;custom:foo#64;^1.0.0 (dev)"| h("custom:foo#64;1.0.0")
a -->|"#64;scoped/b#64;^1.0.0"| i("npm:#64;scoped/b#64;1.0.0")
i -->|"#64;scoped/c#64;^1.0.0"| n("npm:#64;scoped/c#64;1.0.0")
a -->|"#64;scoped/a#64;^1.0.0"| j("npm:#64;scoped/a#64;1.0.0")
a -->|"missing#64;^1.0.0"| missing-1(Missing)
a -->|"workspace-b#64;workspace:*"| b("workspace:workspace-b")
a -->|"workspace-a#64;workspace:*"| c("workspace:workspace-a")
c -->|"workspace-b#64;workspace:* (dev)"| b
c -->|"ipsum#64;^1.0.0 (dev)"| k("npm:ipsum#64;1.0.0")
c -->|"foo#64;^1.0.0 (dev)"| e
`

exports[`test/visualization/mermaid-output.ts > TAP > cycle > should print cycle mermaid output 1`] = `
flowchart TD
a("root:my-project")
a -->|"a#64;^1.0.0"| b("npm:a#64;1.0.0")
b -->|"b#64;^1.0.0"| c("npm:b#64;1.0.0")
c -->|"a#64;^1.0.0"| b
`

exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print mermaid output 1`] = `
flowchart TD
a("root:my-project")
a -->|"foo#64;^1.0.0"| b("npm:foo#64;1.0.0")
a -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c -->|"baz#64;^1.0.0"| d("npm:baz#64;1.0.0")
d -->|"foo#64;^1.0.0"| b
a -->|"missing#64;^1.0.0"| missing-0(Missing)
`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces > should print workspaces mermaid output 1`] = `
flowchart TD
a("root:my-project")
a -->|"b#64;workspace:*"| b("workspace:b")
a -->|"a#64;workspace:*"| c("workspace:a")
`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces with dependencies > select only which package > should exclude workspace b when only which is selected 1`] = `
flowchart TD
c("workspace:a")
c -->|"which#64;^6.0.0"| d("npm:which#64;6.0.0")
`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces with dependencies > should print workspaces with dependencies 1`] = `
flowchart TD
a("root:test-workspaces")
a -->|"b#64;workspace:*"| b("workspace:b")
a -->|"a#64;workspace:*"| c("workspace:a")
c -->|"which#64;^6.0.0"| d("npm:which#64;6.0.0")
d -->|"isexe#64;^3.1.1"| e("npm:isexe#64;3.1.1")
`
