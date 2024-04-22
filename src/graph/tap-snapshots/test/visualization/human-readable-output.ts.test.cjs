/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/human-readable-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
Node {
  pkg: <my-project@1.0.0>,
  edgesOut: [
    Edge -prod-> to: Node { pkg: <foo@1.0.0> node_modules/foo },
    Edge -prod-> to: Node {
      pkg: <bar@1.0.0>,
      edgesOut: [
        Edge -prod-> to: Node {
          pkg: <baz@1.0.0> https://registry.vlt.sh/baz,
          edgesOut: [ Edge -prod-> to: Node { pkg: <foo@1.0.0> node_modules/foo } ]
        }
      ]
    },
    Edge -prod-> to: [missing package]: <missing@^1.0.0>
  ]
}
`
