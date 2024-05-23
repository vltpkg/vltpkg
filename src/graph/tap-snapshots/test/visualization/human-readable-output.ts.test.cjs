/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/human-readable-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
Node {
  id: 'file;%2F%2F%2Fgraph%2Fmy-project',
  location: 'file://{CWD}/my-project',
  edgesOut: [
    Edge -prod-> to: Node {
      id: 'registry;;foo@1.0.0',
      location: '{CWD}/node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
    },
    Edge -prod-> to: Node {
      id: 'registry;;bar@1.0.0',
      location: '{CWD}/node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
      edgesOut: [
        Edge -prod-> to: Node {
          id: 'registry;;baz@1.0.0',
          location: '{CWD}/node_modules/.vlt/registry;;baz@1.0.0/node_modules/baz',
          edgesOut: [
            Edge -prod-> to: Node {
              id: 'registry;;foo@1.0.0',
              location: '{CWD}/node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
            }
          ]
        }
      ]
    },
    Edge -prod-> to: [missing package]: <missing@^1.0.0>
  ]
}
`
