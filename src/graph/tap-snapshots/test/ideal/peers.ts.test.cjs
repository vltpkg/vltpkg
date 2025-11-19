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
a("root:test-peer-install-conflicts") -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"react#64;^18.0.0"| e("npm:react#64;18.3.1")
e("npm:react#64;18.3.1")
e("npm:react#64;18.3.1") -->|"loose-envify#64;^1.1.0"| l("npm:loose-envify#64;1.4.0")
l("npm:loose-envify#64;1.4.0")
l("npm:loose-envify#64;1.4.0") -->|"js-tokens#64;^3.0.0 || ^4.0.0"| q("npm:js-tokens#64;4.0.0")
q("npm:js-tokens#64;4.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| f("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| e("npm:react#64;18.3.1")

g("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")

a("root:test-peer-install-conflicts") -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"react#64;^19.1.0"| h("npm:react#64;19.2.0")
h("npm:react#64;19.2.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| i("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| h("npm:react#64;19.2.0")

j("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")

a("root:test-peer-install-conflicts") -->|"c#64;^1.0.0"| d("npm:c#64;1.0.0")
d("npm:c#64;1.0.0")
d("npm:c#64;1.0.0") -->|"react#64;^17.0.2"| k("npm:react#64;17.0.2")
k("npm:react#64;17.0.2")
k("npm:react#64;17.0.2") -->|"loose-envify#64;^1.1.0"| l("npm:loose-envify#64;1.4.0")

`

exports[`test/ideal/peers.ts > TAP > integration tests > install packages with peer dependencies > should build a peer dependency aware graph 1`] = `
flowchart TD
a("root:test-peer-install")
a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"react#64;^18.0.0"| d("npm:react#64;18.3.1")
d("npm:react#64;18.3.1")
d("npm:react#64;18.3.1") -->|"loose-envify#64;^1.1.0"| j("npm:loose-envify#64;1.4.0")
j("npm:loose-envify#64;1.4.0")
j("npm:loose-envify#64;1.4.0") -->|"js-tokens#64;^3.0.0 || ^4.0.0"| o("npm:js-tokens#64;4.0.0")
o("npm:js-tokens#64;4.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
k("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| e("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| d("npm:react#64;18.3.1")

f("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| l("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")

a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"react#64;^19.1.0"| g("npm:react#64;19.2.0")
g("npm:react#64;19.2.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| h("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| g("npm:react#64;19.2.0")

i("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")

`

exports[`test/ideal/peers.ts > TAP > integration tests > longer setup with mixed interdependencies > should build a valid graph with complex peer interdependencies 1`] = `
flowchart TD
a("root:test-peer-install")
a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-1#64;^1.0.0"| b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"react#64;^18.0.0"| f("npm:react#64;18.3.1")
f("npm:react#64;18.3.1")
f("npm:react#64;18.3.1") -->|"loose-envify#64;^1.1.0"| l("npm:loose-envify#64;1.4.0")
l("npm:loose-envify#64;1.4.0")
l("npm:loose-envify#64;1.4.0") -->|"js-tokens#64;^3.0.0 || ^4.0.0"| q("npm:js-tokens#64;4.0.0")
q("npm:js-tokens#64;4.0.0")
b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")
g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^1.0.0 (peer)"| m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0")
m("npm:#64;isaacs/peer-dep-cycle-b#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^1.0.0 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")
n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^1.0.0 (peer)"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

b("npm:#64;ruyadorno/package-peer-parent-1#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| f("npm:react#64;18.3.1")

h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| n("npm:#64;isaacs/peer-dep-cycle-c#64;1.0.0")

a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-2#64;^1.0.0"| c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"react#64;^19.1.0"| i("npm:react#64;19.2.0")
i("npm:react#64;19.2.0")
c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0"| j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")
j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-b#64;^2.0.0 (peer)"| o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0")
o("npm:#64;isaacs/peer-dep-cycle-b#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-c#64;^2.0.0 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")
p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;^2.0.0 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

c("npm:#64;ruyadorno/package-peer-parent-2#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")
k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1 || 2 (peer)"| j("npm:#64;isaacs/peer-dep-cycle-a#64;2.0.0")

k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"react#64;18 || 19 (peer)"| i("npm:react#64;19.2.0")

k("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0") -->|"#64;isaacs/peer-dep-cycle-c#64;1 || 2 (peer)"| p("npm:#64;isaacs/peer-dep-cycle-c#64;2.0.0")

a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-3#64;^1.0.0"| d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0")
d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0")
d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0") -->|"react#64;18"| f("npm:react#64;18.3.1")

d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

d("npm:#64;ruyadorno/package-peer-parent-3#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")

a("root:test-peer-install") -->|"#64;ruyadorno/package-peer-parent-4#64;^1.0.0"| e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0")
e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0")
e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0") -->|"react#64;18 || 19"| f("npm:react#64;18.3.1")

e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0") -->|"#64;isaacs/peer-dep-cycle-a#64;1"| g("npm:#64;isaacs/peer-dep-cycle-a#64;1.0.0")

e("npm:#64;ruyadorno/package-peer-parent-4#64;1.0.0") -->|"#64;ruyadorno/package-with-flexible-peer-deps#64;^1.1.0"| h("npm:#64;ruyadorno/package-with-flexible-peer-deps#64;1.1.0")

`
