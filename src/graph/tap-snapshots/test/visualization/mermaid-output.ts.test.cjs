/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > actual graph > selected packages > should print selected packages 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"bar#64;^1.0.0 (optional)"| g("npm:bar#64;1.0.0")
g("npm:bar#64;1.0.0")
g("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0"| m("custom:baz#64;1.0.0")
m("custom:baz#64;1.0.0")


`

exports[`test/visualization/mermaid-output.ts > TAP > actual graph > should print from an actual loaded graph 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"link#64;file:./linked"| d("file(linked):linked#64;1.0.0")
d("file(linked):linked#64;1.0.0")
a("root:my-project") -->|"foo#64;^1.0.0"| e("npm:foo#64;1.0.0")
e("npm:foo#64;1.0.0")
a("root:my-project") -->|"extraneous#64;*"| f("npm:extraneous#64;1.0.0")
f("npm:extraneous#64;1.0.0")
a("root:my-project") -->|"bar#64;^1.0.0 (optional)"| g("npm:bar#64;1.0.0")
g("npm:bar#64;1.0.0")
g("npm:bar#64;1.0.0") -->|"blooo#64;1"| l("npm:blooo#64;1.0.0")
l("npm:blooo#64;1.0.0")
g("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0"| m("custom:baz#64;1.0.0")
m("custom:baz#64;1.0.0")
a("root:my-project") -->|"aliased#64;custom:foo#64;^1.0.0 (dev)"| h("custom:foo#64;1.0.0")
h("custom:foo#64;1.0.0")
a("root:my-project") -->|"#64;scoped/b#64;^1.0.0"| i("npm:#64;scoped/b#64;1.0.0")
i("npm:#64;scoped/b#64;1.0.0")
i("npm:#64;scoped/b#64;1.0.0") -->|"#64;scoped/c#64;^1.0.0"| n("npm:#64;scoped/c#64;1.0.0")
n("npm:#64;scoped/c#64;1.0.0")
a("root:my-project") -->|"#64;scoped/a#64;^1.0.0"| j("npm:#64;scoped/a#64;1.0.0")
j("npm:#64;scoped/a#64;1.0.0")
a("root:my-project") -->|"missing#64;^1.0.0"| missing-1(Missing)

b("workspace:workspace-b")
c("workspace:workspace-a")
c("workspace:workspace-a") -->|"workspace-b#64;workspace:* (dev)"| b("workspace:workspace-b")
b("workspace:workspace-b")
c("workspace:workspace-a") -->|"ipsum#64;^1.0.0 (dev)"| k("npm:ipsum#64;1.0.0")
k("npm:ipsum#64;1.0.0")
c("workspace:workspace-a") -->|"foo#64;^1.0.0 (dev)"| e("npm:foo#64;1.0.0")
e("npm:foo#64;1.0.0")
`

exports[`test/visualization/mermaid-output.ts > TAP > cycle > should print cycle mermaid output 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"a#64;^1.0.0"| b("npm:a#64;1.0.0")
b("npm:a#64;1.0.0")
b("npm:a#64;1.0.0") -->|"b#64;^1.0.0"| c("npm:b#64;1.0.0")
c("npm:b#64;1.0.0")
c("npm:b#64;1.0.0") -->|"a#64;^1.0.0"| b("npm:a#64;1.0.0")

`

exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print mermaid output 1`] = `
flowchart TD
a("root:my-project")
a("root:my-project") -->|"foo#64;^1.0.0"| b("npm:foo#64;1.0.0")
b("npm:foo#64;1.0.0")
a("root:my-project") -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0")
c("npm:bar#64;1.0.0") -->|"baz#64;^1.0.0"| d("npm:baz#64;1.0.0")
d("npm:baz#64;1.0.0")
d("npm:baz#64;1.0.0") -->|"foo#64;^1.0.0"| b("npm:foo#64;1.0.0")

a("root:my-project") -->|"missing#64;^1.0.0"| missing-0(Missing)

`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces > should print workspaces mermaid output 1`] = `
flowchart TD
a("root:my-project")
b("workspace:b")
c("workspace:a")
`
