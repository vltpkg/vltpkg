/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from a virtual graph > must match snapshot 1`] = `
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
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: 'registry;;missing@1.0.0',
        location: './node_modules/.vlt/registry;;missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      },
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: 'registry;;baz@1.0.0',
        location: './node_modules/.vlt/registry;;baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from an actual graph > must match snapshot 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file;linked', location: './linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@*) -prod-> to: [extraneous package]: <extraneous>,
      Edge spec(aliased@custom:foo@^1.0.0) -dev-> to: Node {
        id: 'registry;custom;foo@1.0.0',
        location: './node_modules/.vlt/registry;custom;foo@1.0.0/node_modules/foo'
      },
      Edge spec(@scoped/b@^1.0.0) -prod-> to: Node {
        id: 'registry;;@scoped%2Fb@1.0.0',
        location: './node_modules/.vlt/registry;;@scoped%2Fb@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@^1.0.0) -prod-> to: Node {
            id: 'registry;;@scoped%2Fc@1.0.0',
            location: './node_modules/.vlt/registry;;@scoped%2Fc@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@^1.0.0) -prod-> to: Node {
        id: 'registry;;@scoped%2Fa@1.0.0',
        location: './node_modules/.vlt/registry;;@scoped%2Fa@1.0.0/node_modules/@scoped/a'
      },
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: 'registry;;missing@1.0.0',
        location: './node_modules/.vlt/registry;;missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      },
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: 'registry;;baz@1.0.0',
        location: './node_modules/.vlt/registry;;baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  },
  Node {
    id: 'workspace;packages%2Fworkspace-b',
    location: './packages/workspace-b',
    importer: true,
    edgesOut: [
      Edge spec(baz@^1.0.0) -prod-> to: Node { ref: 'registry;;baz@1.0.0' }
    ]
  },
  Node {
    id: 'workspace;packages%2Fworkspace-a',
    location: './packages/workspace-a',
    importer: true,
    edgesOut: [
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { ref: 'workspace;packages%2Fworkspace-b' },
      Edge spec(ipsum@^1.0.0) -dev-> to: Node {
        id: 'registry;;ipsum@1.0.0',
        location: './node_modules/.vlt/registry;;ipsum@1.0.0/node_modules/ipsum'
      },
      Edge spec(foo@^1.0.0) -dev-> to: Node { ref: 'registry;;foo@1.0.0' }
    ]
  }
]
`
