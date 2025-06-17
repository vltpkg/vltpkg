/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/mermaid-output.ts > TAP > actual graph > selected packages > should print selected packages 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
file%C2%B7.("root:my-project") -->|"bar#64;^1.0.0 (optional)"| %C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0 (prod)"| %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
%C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")


`

exports[`test/visualization/mermaid-output.ts > TAP > actual graph > should print from an actual loaded graph 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
file%C2%B7.("root:my-project") -->|"link#64;file:./linked (prod)"| file%C2%B7linked("file(linked):linked#64;1.0.0")
file%C2%B7linked("file(linked):linked#64;1.0.0")
file%C2%B7.("root:my-project") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
%C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
file%C2%B7.("root:my-project") -->|"extraneous#64;* (prod)"| %C2%B7%C2%B7extraneous%401.0.0("npm:extraneous#64;1.0.0")
%C2%B7%C2%B7extraneous%401.0.0("npm:extraneous#64;1.0.0")
file%C2%B7.("root:my-project") -->|"bar#64;^1.0.0 (optional)"| %C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0") -->|"blooo#64;1 (prod)"| %C2%B7%C2%B7blooo%401.0.0("npm:blooo#64;1.0.0")
%C2%B7%C2%B7blooo%401.0.0("npm:blooo#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0") -->|"baz#64;custom:baz#64;^1.0.0 (prod)"| %C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
%C2%B7custom%C2%B7baz%401.0.0("custom:baz#64;1.0.0")
file%C2%B7.("root:my-project") -->|"aliased#64;custom:foo#64;^1.0.0 (dev)"| %C2%B7custom%C2%B7foo%401.0.0("custom:foo#64;1.0.0")
%C2%B7custom%C2%B7foo%401.0.0("custom:foo#64;1.0.0")
file%C2%B7.("root:my-project") -->|"#64;scoped/b#64;^1.0.0 (prod)"| %C2%B7%C2%B7%40scoped%C2%A7b%401.0.0("npm:#64;scoped/b#64;1.0.0")
%C2%B7%C2%B7%40scoped%C2%A7b%401.0.0("npm:#64;scoped/b#64;1.0.0")
%C2%B7%C2%B7%40scoped%C2%A7b%401.0.0("npm:#64;scoped/b#64;1.0.0") -->|"#64;scoped/c#64;^1.0.0 (prod)"| %C2%B7%C2%B7%40scoped%C2%A7c%401.0.0("npm:#64;scoped/c#64;1.0.0")
%C2%B7%C2%B7%40scoped%C2%A7c%401.0.0("npm:#64;scoped/c#64;1.0.0")
file%C2%B7.("root:my-project") -->|"#64;scoped/a#64;^1.0.0 (prod)"| %C2%B7%C2%B7%40scoped%C2%A7a%401.0.0("npm:#64;scoped/a#64;1.0.0")
%C2%B7%C2%B7%40scoped%C2%A7a%401.0.0("npm:#64;scoped/a#64;1.0.0")
file%C2%B7.("root:my-project") -->|"missing#64;^1.0.0 (prod)"| missing-1(Missing)

workspace%C2%B7packages%C2%A7workspace-b("workspace:workspace-b")
workspace%C2%B7packages%C2%A7workspace-a("workspace:workspace-a")
workspace%C2%B7packages%C2%A7workspace-a("workspace:workspace-a") -->|"workspace-b#64;workspace:* (dev)"| workspace%C2%B7packages%C2%A7workspace-b("workspace:workspace-b")
workspace%C2%B7packages%C2%A7workspace-b("workspace:workspace-b")
workspace%C2%B7packages%C2%A7workspace-a("workspace:workspace-a") -->|"ipsum#64;^1.0.0 (dev)"| %C2%B7%C2%B7ipsum%401.0.0("npm:ipsum#64;1.0.0")
%C2%B7%C2%B7ipsum%401.0.0("npm:ipsum#64;1.0.0")
workspace%C2%B7packages%C2%A7workspace-a("workspace:workspace-a") -->|"foo#64;^1.0.0 (dev)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
%C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
`

exports[`test/visualization/mermaid-output.ts > TAP > cycle > should print cycle mermaid output 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
file%C2%B7.("root:my-project") -->|"a#64;^1.0.0 (prod)"| %C2%B7%C2%B7a%401.0.0("npm:a#64;1.0.0")
%C2%B7%C2%B7a%401.0.0("npm:a#64;1.0.0")
%C2%B7%C2%B7a%401.0.0("npm:a#64;1.0.0") -->|"b#64;^1.0.0 (prod)"| %C2%B7%C2%B7b%401.0.0("npm:b#64;1.0.0")
%C2%B7%C2%B7b%401.0.0("npm:b#64;1.0.0")
%C2%B7%C2%B7b%401.0.0("npm:b#64;1.0.0") -->|"a#64;^1.0.0 (prod)"| %C2%B7%C2%B7a%401.0.0("npm:a#64;1.0.0")

`

exports[`test/visualization/mermaid-output.ts > TAP > human-readable-output > should print mermaid output 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
file%C2%B7.("root:my-project") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
%C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")
file%C2%B7.("root:my-project") -->|"bar#64;^1.0.0 (prod)"| %C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0")
%C2%B7%C2%B7bar%401.0.0("npm:bar#64;1.0.0") -->|"baz#64;^1.0.0 (prod)"| %C2%B7%C2%B7baz%401.0.0("npm:baz#64;1.0.0")
%C2%B7%C2%B7baz%401.0.0("npm:baz#64;1.0.0")
%C2%B7%C2%B7baz%401.0.0("npm:baz#64;1.0.0") -->|"foo#64;^1.0.0 (prod)"| %C2%B7%C2%B7foo%401.0.0("npm:foo#64;1.0.0")

file%C2%B7.("root:my-project") -->|"missing#64;^1.0.0 (prod)"| missing-0(Missing)

`

exports[`test/visualization/mermaid-output.ts > TAP > workspaces > should print workspaces mermaid output 1`] = `
flowchart TD
file%C2%B7.("root:my-project")
workspace%C2%B7packages%C2%A7b("workspace:b")
workspace%C2%B7packages%C2%A7a("workspace:a")
`
