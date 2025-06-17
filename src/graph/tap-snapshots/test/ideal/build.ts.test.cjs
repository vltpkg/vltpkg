/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/build.ts > TAP > build from actual files > should build an ideal tree starting from a virtual graph 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo'
      }
    ]
  }
]
`

exports[`test/ideal/build.ts > TAP > build from lockfile > should build an ideal tree starting from a virtual graph 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      }
    ]
  }
]
`
