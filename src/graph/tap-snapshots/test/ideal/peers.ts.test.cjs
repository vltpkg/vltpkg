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
e -->|"loose-envify#64;^1.1.0"| h("npm:loose-envify#64;1.4.0")
h -->|"js-tokens#64;^3.0.0 || ^4.0.0"| i("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| j("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
j -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| j
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| p("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| j
p -->|"react#64;18 || 19 (peer)"| e
p -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| l
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| f("npm:react#64;19.2.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| m("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
m -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
n -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
o -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| m
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| q("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
q -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| m
q -->|"react#64;18 || 19 (peer)"| f
q -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| o
a -->|"c#64;^1.0.0"| d("npm:c#64;1.0.0")
d -->|"react#64;^17.0.2"| g("npm:react#64;17.0.2")
g -->|"loose-envify#64;^1.1.0"| h
`

exports[`test/ideal/peers.ts > TAP > integration tests > install packages with peer dependencies > should build a peer dependency aware graph 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b -->|"react#64;^18.0.0"| d("npm:react#64;18.3.1")
d -->|"loose-envify#64;^1.1.0"| f("npm:loose-envify#64;1.4.0")
f -->|"js-tokens#64;^3.0.0 || ^4.0.0"| g("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| h("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
h -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| i("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
i -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| h
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| n("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
n -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| h
n -->|"react#64;18 || 19 (peer)"| d
n -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| e("npm:react#64;19.2.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| k("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
k -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
l -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
m -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| k
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| o("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
o -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| k
o -->|"react#64;18 || 19 (peer)"| e
o -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| m
`

exports[`test/ideal/peers.ts > TAP > integration tests > longer setup with mixed interdependencies > should build a valid graph with complex peer interdependencies 1`] = `
flowchart TD
a("root:test-peer-install")
a -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b -->|"react#64;^18.0.0"| f("npm:react#64;18.3.1")
f -->|"loose-envify#64;^1.1.0"| h("npm:loose-envify#64;1.4.0")
h -->|"js-tokens#64;^3.0.0 || ^4.0.0"| i("npm:js-tokens#64;4.0.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| j("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
j -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| j
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| p("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| j
p -->|"react#64;18 || 19 (peer)"| g("npm:react#64;19.2.0")
p -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| l
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c -->|"react#64;^19.1.0"| g
c -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| m("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
m -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
n -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
o -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| m
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| q("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
q -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| m
q -->|"react#64;18 || 19 (peer)"| g
q -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| o
a -->|"#64;ruyadorno/package-peer-parent-3#64;^1.0.0"| d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0")
d -->|"react#64;18"| f
d -->|"#64;isaacs/peer-dep-cycle-a#64;1"| j
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| p
a -->|"#64;ruyadorno/package-peer-parent-4#64;^1.0.0"| e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0")
e -->|"react#64;18 || 19"| f
e -->|"#64;isaacs/peer-dep-cycle-a#64;1"| j
e -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| p
`

exports[`test/ideal/peers.ts > TAP > integration tests > multi-workspace peer context isolation with 4 workspaces > should build graph with 4 workspaces having isolated peer contexts 1`] = `
flowchart TD
a("root:test-10")
a -->|"react#64;^19.0.0"| b("npm:react#64;19.2.0")
a -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| m("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
m -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
n -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
o -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| m
a -->|"a#64;workspace:*"| c("workspace:a")
c -->|"react#64;^18"| d("npm:react#64;18.3.1")
d -->|"loose-envify#64;^1.1.0"| h("npm:loose-envify#64;1.4.0")
h -->|"js-tokens#64;^3.0.0 || ^4.0.0"| i("npm:js-tokens#64;4.0.0")
c -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| j("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
j -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| j
c -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| p("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
p -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| j
p -->|"react#64;18 || 19 (peer)"| d
p -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| l
a -->|"b#64;workspace:*"| e("workspace:b")
e -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| m
e -->|"react#64;^19"| b
e -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| q("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
q -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| m
q -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| o
q -->|"react#64;18 || 19 (peer)"| b
a -->|"c#64;workspace:*"| f("workspace:c")
f -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| j
f -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| p
f -->|"react#64;^18"| d
a -->|"d#64;workspace:*"| g("workspace:d")
g -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| m
g -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| q
g -->|"react#64;^19"| b
`

exports[`test/ideal/peers.ts > TAP > integration tests > outlier peer - workspace sibling with different peer context > should build graph with outlier peer context handling 1`] = `
flowchart TD
a("root:outlier-peer")
a -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
b -->|"react#64;^19.1.0"| e("npm:react#64;19.2.0")
b -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
h -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| i("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
i -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
j -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| h
b -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| h
k -->|"react#64;18 || 19 (peer)"| e
k -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
a -->|"react#64;18"| c("npm:react#64;18.3.1")
c -->|"loose-envify#64;^1.1.0"| f("npm:loose-envify#64;1.4.0")
f -->|"js-tokens#64;^3.0.0 || ^4.0.0"| g("npm:js-tokens#64;4.0.0")
a -->|"a#64;workspace:*"| d("workspace:a")
d -->|"react#64;18"| c
d -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.0.0"| l("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
l -->|"react#64;18 || 19 (peer)"| c
l -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| h
l -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| j
`
