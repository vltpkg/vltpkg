/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/peers.ts > TAP > integration tests > install multiple conflict peer dependencies versions at the same level > should build graph with multiple conflicting peer dependency contexts 1`] = `
flowchart TD
a("root:test-peer-install-conflicts")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| h("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
h -->|"react#64;^18.0.0"| p("npm:react#64;18.3.1")
p -->|"loose-envify#64;^1.1.0"| n("npm:loose-envify#64;1.4.0")
n -->|"js-tokens#64;^3.0.0 || ^4.0.0"| m("npm:js-tokens#64;4.0.0")
h -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| b("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
b -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| d("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
d -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| f("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| b
h -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| b
j -->|"react#64;18 || 19 (peer)"| p
j -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| f
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| i("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
i -->|"react#64;^19.1.0"| q("npm:react#64;19.2.0")
i -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
c -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
e -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| g("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| c
i -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
k -->|"react#64;18 || 19 (peer)"| q
k -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| g
a -->|"c#64;^1.0.0"| l("npm:c#64;1.0.0")
l -->|"react#64;^17.0.2"| o("npm:react#64;17.0.2")
o -->|"loose-envify#64;^1.1.0"| n
`

exports[`test/ideal/peers.ts > TAP > integration tests > install packages with peer dependencies > should build a peer dependency aware graph 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| h("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
h -->|"react#64;^18.0.0"| n("npm:react#64;18.3.1")
n -->|"loose-envify#64;^1.1.0"| m("npm:loose-envify#64;1.4.0")
m -->|"js-tokens#64;^3.0.0 || ^4.0.0"| l("npm:js-tokens#64;4.0.0")
h -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| b("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
b -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| d("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
d -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| f("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| b
h -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| b
j -->|"react#64;18 || 19 (peer)"| n
j -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| f
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| i("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
i -->|"react#64;^19.1.0"| o("npm:react#64;19.2.0")
i -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
c -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
e -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| g("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| c
i -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
k -->|"react#64;18 || 19 (peer)"| o
k -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| g
`

exports[`test/ideal/peers.ts > TAP > integration tests > longer setup with mixed interdependencies > should build a valid graph with complex peer interdependencies 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| h("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
h -->|"react#64;^18.0.0"| p("npm:react#64;18.3.1")
p -->|"loose-envify#64;^1.1.0"| o("npm:loose-envify#64;1.4.0")
o -->|"js-tokens#64;^3.0.0 || ^4.0.0"| n("npm:js-tokens#64;4.0.0")
h -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| b("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
b -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| d("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
d -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| f("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| b
h -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| l("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| b
l -->|"react#64;18 || 19 (peer)"| p
l -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| f
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| i("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
i -->|"react#64;^19.1.0"| q("npm:react#64;19.2.0")
i -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
c -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
e -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| g("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| c
i -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| m("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
m -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
m -->|"react#64;18 || 19 (peer)"| q
m -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| g
a -->|"#64;ruyadorno/package-peer-parent-3#64;^1.0.0"| j("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0")
j -->|"react#64;18"| p
j -->|"#64;isaacs/peer-dep-cycle-a#64;1"| b
j -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| l
a -->|"#64;ruyadorno/package-peer-parent-4#64;^1.0.0"| k("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0")
k -->|"react#64;18 || 19"| p
k -->|"#64;isaacs/peer-dep-cycle-a#64;1"| b
k -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| l
`

exports[`test/ideal/peers.ts > TAP > integration tests > multi-workspace peer context isolation with 4 workspaces > should build graph with 4 workspaces having isolated peer contexts 1`] = `
flowchart TD
a("root:test-10")
a -->|"react#64;^19.0.0"| q("npm:react#64;19.2.0")
a -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| g("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
g -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| i("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
i -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
k -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| g
a -->|"a#64;workspace:*"| b("workspace:a")
b -->|"react#64;^18"| p("npm:react#64;18.3.1")
p -->|"loose-envify#64;^1.1.0"| o("npm:loose-envify#64;1.4.0")
o -->|"js-tokens#64;^3.0.0 || ^4.0.0"| n("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| h("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
h -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| f
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| l("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| f
l -->|"react#64;18 || 19 (peer)"| p
l -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
a -->|"b#64;workspace:*"| c("workspace:b")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| g
c -->|"react#64;^19"| q
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| m("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
m -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| g
m -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| k
m -->|"react#64;18 || 19 (peer)"| q
a -->|"c#64;workspace:*"| d("workspace:c")
d -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| l
d -->|"react#64;^18"| p
a -->|"d#64;workspace:*"| e("workspace:d")
e -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| g
e -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| m
e -->|"react#64;^19"| q
`

exports[`test/ideal/peers.ts > TAP > integration tests > outlier peer - workspace sibling with different peer context > should build graph with outlier peer context handling 1`] = `
flowchart TD
a("root:outlier-peer")
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| f("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
f -->|"react#64;^19.1.0"| l("npm:react#64;19.2.0")
f -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
c -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| d("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
d -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
e -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| c
f -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
g -->|"react#64;18 || 19 (peer)"| l
g -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| e
a -->|"react#64;18"| k("npm:react#64;18.3.1")
k -->|"loose-envify#64;^1.1.0"| j("npm:loose-envify#64;1.4.0")
j -->|"js-tokens#64;^3.0.0 || ^4.0.0"| i("npm:js-tokens#64;4.0.0")
a -->|"a#64;workspace:*"| b("workspace:a")
b -->|"react#64;18"| k
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
h -->|"react#64;18 || 19 (peer)"| k
h -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
h -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| e
`
