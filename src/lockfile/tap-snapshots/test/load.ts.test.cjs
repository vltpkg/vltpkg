/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/load.ts > TAP > custom origin > must match snapshot 1`] = `
Node {
  pkg: <my-project@1.0.0> .tap/fixtures/test-load.ts-custom-origin,
  edgesOut: [
    Edge -prod-> to: Node {
      pkg: <my-host:@scope/foo@1.0.0> https://example.com/@scope/foo/-/foo-1.0.0.tgz
    }
  ]
}
`

exports[`test/load.ts > TAP > load > must match snapshot 1`] = `
Node {
  pkg: <my-project@1.0.0> .tap/fixtures/test-load.ts-load,
  edgesOut: [
    Edge -prod-> to: Node { pkg: <foo@1.0.0> },
    Edge -prod-> to: Node {
      pkg: <bar@1.0.0>,
      edgesOut: [
        Edge -prod-> to: Node {
          pkg: <baz@1.0.0>,
          edgesOut: [ Edge -prod-> to: Node { pkg: <foo@1.0.0> } ]
        }
      ]
    },
    Edge -prod-> to: [missing package]: <missing@^1.0.0>
  ]
}
`
