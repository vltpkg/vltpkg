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
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b -->|"react#64;^18.0.0"| e("npm:react#64;18.3.1")
e -->|"loose-envify#64;^1.1.0"| l("npm:loose-envify#64;1.4.0")
l -->|"js-tokens#64;^3.0.0 || ^4.0.0"| q("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| f
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| f
g -->|"react#64;18 || 19 (peer)"| e
g -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| h("npm:react#64;19.2.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
i -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| i
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| i
j -->|"react#64;18 || 19 (peer)"| h
j -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| p
a -->|"c#64;^1.0.0"| d("npm:c#64;1.0.0")
d -->|"react#64;^17.0.2"| k("npm:react#64;17.0.2")
k -->|"loose-envify#64;^1.1.0"| l
`

exports[`test/ideal/peers.ts > TAP > integration tests > install packages with peer dependencies > should build a peer dependency aware graph 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b -->|"react#64;^18.0.0"| d("npm:react#64;18.3.1")
d -->|"loose-envify#64;^1.1.0"| j("npm:loose-envify#64;1.4.0")
j -->|"js-tokens#64;^3.0.0 || ^4.0.0"| o("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
e -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| e
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
f -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| e
f -->|"react#64;18 || 19 (peer)"| d
f -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| l
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| g("npm:react#64;19.2.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
h -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
m -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
n -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| h
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
i -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| h
i -->|"react#64;18 || 19 (peer)"| g
i -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n
`

exports[`test/ideal/peers.ts > TAP > integration tests > longer setup with mixed interdependencies > should build a valid graph with complex peer interdependencies 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b -->|"react#64;^18.0.0"| f("npm:react#64;18.3.1")
f -->|"loose-envify#64;^1.1.0"| l("npm:loose-envify#64;1.4.0")
l -->|"js-tokens#64;^3.0.0 || ^4.0.0"| q("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
g -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| g
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
h -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| g
h -->|"react#64;18 || 19 (peer)"| f
h -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| i("npm:react#64;19.2.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
j -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| j
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| j
k -->|"react#64;18 || 19 (peer)"| i
k -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| p
a -->|"#64;ruyadorno/package-peer-parent-3#64;^1.0.0"| d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0")
d -->|"react#64;18"| f
d -->|"#64;isaacs/peer-dep-cycle-a#64;1"| g
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h
a -->|"#64;ruyadorno/package-peer-parent-4#64;^1.0.0"| e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0")
e -->|"react#64;18 || 19"| f
e -->|"#64;isaacs/peer-dep-cycle-a#64;1"| g
e -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h
`

exports[`test/ideal/peers.ts > TAP > integration tests > multi-workspace peer context isolation with 4 workspaces > should build graph with 4 workspaces having isolated peer contexts 1`] = `
flowchart TD
a("root:test-10")
a -->|"react#64;^19.0.0"| b("npm:react#64;19.2.0")
a -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
c -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
l -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| c
a -->|"a#64;workspace:*"| d("workspace:a")
d -->|"react#64;^18"| e("npm:react#64;18.3.1")
e -->|"loose-envify#64;^1.1.0"| m("npm:loose-envify#64;1.4.0")
m -->|"js-tokens#64;^3.0.0 || ^4.0.0"| q("npm:js-tokens#64;4.0.0")
d -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
f -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
n -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
o -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| f
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
g -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| f
g -->|"react#64;18 || 19 (peer)"| e
g -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| o
a -->|"b#64;workspace:*"| h("workspace:b")
h -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c
h -->|"react#64;^19"| b
h -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
i -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| c
i -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| p
i -->|"react#64;18 || 19 (peer)"| b
a -->|"c#64;workspace:*"| j("workspace:c")
j -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f
j -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| g
j -->|"react#64;^18"| e
a -->|"d#64;workspace:*"| k("workspace:d")
k -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| c
k -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| i
k -->|"react#64;^19"| b
`

exports[`test/ideal/peers.ts > TAP > integration tests > outlier peer - workspace sibling with different peer context > should build graph with outlier peer context handling 1`] = `
flowchart TD
a("root:outlier-peer")
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
b -->|"react#64;^19.1.0"| f("npm:react#64;19.2.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| g("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
g -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
k -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| g
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
h -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| g
h -->|"react#64;18 || 19 (peer)"| f
h -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
a -->|"react#64;18"| c("npm:react#64;18.3.1")
c -->|"loose-envify#64;^1.1.0"| i("npm:loose-envify#64;1.4.0")
i -->|"js-tokens#64;^3.0.0 || ^4.0.0"| l("npm:js-tokens#64;4.0.0")
a -->|"a#64;workspace:*"| d("workspace:a")
d -->|"react#64;18"| c
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| e("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
e -->|"react#64;18 || 19 (peer)"| c
e -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| g
e -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
`
