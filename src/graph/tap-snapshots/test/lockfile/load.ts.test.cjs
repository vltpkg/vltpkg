/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/load.ts > TAP > load > must match snapshot 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node {
        id: 'file;linked',
        location: './node_modules/.vlt/file;linked/node_modules/linked'
      },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      },
      Edge spec(bar@^1.0.0) -prod-> to: Node {
        id: 'registry;;bar@1.0.0',
        location: './node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
        resolved: 'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        integrity: 'sha512-6/deadbeef==',
        edgesOut: [
          Edge spec(baz@^1.0.0) -prod-> to: Node {
            id: 'registry;;baz@1.0.0',
            location: './node_modules/.vlt/registry;;baz@1.0.0/node_modules/baz'
          }
        ]
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  }
]
`

exports[`test/lockfile/load.ts > TAP > workspaces > must match snapshot 1`] = `
[
  Node { id: 'file;.', location: '.', importer: true },
  Node {
    id: 'workspace;packages%2Fb',
    location: './packages/b',
    importer: true,
    edgesOut: [
      Edge spec(c@^1.0.0) -prod-> to: Node {
        id: 'registry;;c@1.0.0',
        location: './node_modules/.vlt/registry;;c@1.0.0/node_modules/c',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      }
    ]
  },
  Node {
    id: 'workspace;packages%2Fa',
    location: './packages/a',
    importer: true
  }
]
`
