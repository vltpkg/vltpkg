/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/edge.ts > TAP > Edge > must match snapshot 1`] = `
Edge [@vltpkg/graph.Edge] {
  from: [Node [@vltpkg/graph.Node]],
  to: [Node [@vltpkg/graph.Node]],
  type: 'dependencies',
  spec: Spec {child@^1.0.0}
}
`

exports[`test/edge.ts > TAP > Edge > must match snapshot 2`] = `
Edge [@vltpkg/graph.Edge] {
  from: Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(0) {},
    id: 'registry;;child@1.0.0',
    importer: false,
    integrity: undefined,
    manifest: [Object],
    name: 'child',
    resolved: undefined
  },
  to: undefined,
  type: 'dependencies',
  spec: Spec {missing@latest}
}
`
