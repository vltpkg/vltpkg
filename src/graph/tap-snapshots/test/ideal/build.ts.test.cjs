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
    id: 'file~_d',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@1.0.0) -prod-> to: Node {
        id: '~npm~foo@1.0.0',
        location: './node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo'
      }
    ]
  }
]
`

exports[`test/ideal/build.ts > TAP > build from lockfile > should build an ideal tree starting from a virtual graph 1`] = `
[
  Node {
    id: 'file~_d',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '~npm~foo@1.0.0',
        location: './node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-URO90jLnKPqX+P7OLnJkiIQfMX4I6gEdGZ1T84drQLtRPw6uNKYLZfB6K3hjWIrj0VZB1kh2cTFdeq01i6XIYQ=='
      }
    ]
  }
]
`
