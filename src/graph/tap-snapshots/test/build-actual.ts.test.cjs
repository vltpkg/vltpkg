/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/build-actual.ts > TAP > build a graph representing what is actually in the fs > must match snapshot 1`] = `
Node {
  pkg: <my-project@1.0.0>,
  edgesOut: [
    Edge -prod-> to: Node {
      pkg: <npm:foo@0.0.0> .tap/fixtures/test-build-actual.ts-build-a-graph-representing-what-is-actually-in-the-fs/node_modules/.vlt/registry/https%3A%2F%2Fregistry.npmjs.org/foo@1.0.0
    },
    Edge -prod-> to: Node {
      pkg: <npm:bar@1.0.0> .tap/fixtures/test-build-actual.ts-build-a-graph-representing-what-is-actually-in-the-fs/node_modules/.vlt/registry/https%3A%2F%2Fregistry.npmjs.org/bar@1.0.0,
      edgesOut: [
        Edge -prod-> to: Node {
          pkg: <npm:@scoped/baz@1.0.0> .tap/fixtures/test-build-actual.ts-build-a-graph-representing-what-is-actually-in-the-fs/node_modules/.vlt/registry/https%3A%2F%2Fregistry.npmjs.org/%40scoped%2Fbaz@1.0.0
        },
        Edge -prod-> to: [missing package]: <foo@^1.0.0>
      ]
    }
  ]
}
`
