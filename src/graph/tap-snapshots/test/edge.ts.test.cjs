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
  spec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'child@^1.0.0'[39m,
    name: [32m'child'[39m,
    bareSpec: [32m'^1.0.0'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    registrySpec: [32m'^1.0.0'[39m,
    semver: [32m'^1.0.0'[39m,
    range: Range {
      raw: [32m'^1.0.0'[39m,
      isAny: [33mfalse[39m,
      set: [
        Comparator {
          includePrerelease: [33mfalse[39m,
          raw: [32m'^1.0.0'[39m,
          tokens: [ [32m'^1.0.0'[39m ],
          tuples: [
            [
              [32m'>='[39m,
              Version {
                raw: [32m'1.0.0'[39m,
                major: [33m1[39m,
                minor: [33m0[39m,
                patch: [33m0[39m,
                prerelease: [90mundefined[39m,
                build: [90mundefined[39m
              }
            ],
            [
              [32m'<'[39m,
              Version {
                raw: [32m'1.0.0'[39m,
                major: [33m2[39m,
                minor: [33m0[39m,
                patch: [33m0[39m,
                prerelease: [ [33m0[39m ],
                build: [90mundefined[39m
              }
            ]
          ],
          isNone: [33mfalse[39m,
          isAny: [33mfalse[39m
        }
      ],
      includePrerelease: [33mfalse[39m
    }
  }
}
`

exports[`test/edge.ts > TAP > Edge > must match snapshot 2`] = `
Edge [@vltpkg/graph.Edge] {
  from: Node [@vltpkg/graph.Node] {
    edgesIn: Set(0) {},
    edgesOut: Map(0) {},
    id: 1,
    isRoot: false,
    pkg: [Object]
  },
  to: undefined,
  type: 'dependencies',
  spec: @vltpkg/spec.Spec {
    type: [32m'registry'[39m,
    spec: [32m'missing@latest'[39m,
    name: [32m'missing'[39m,
    bareSpec: [32m'latest'[39m,
    registry: [32m'https://registry.npmjs.org/'[39m,
    registrySpec: [32m'latest'[39m,
    distTag: [32m'latest'[39m
  }
}
`
