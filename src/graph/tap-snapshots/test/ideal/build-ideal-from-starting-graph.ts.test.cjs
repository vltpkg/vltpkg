/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > add from manifest file only > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '··baz@1.0.0',
        location: './node_modules/.vlt/··baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from a virtual graph > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node {
        id: 'file·linked',
        location: './node_modules/.vlt/file·linked/node_modules/linked',
        resolved: 'linked'
      },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      },
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: '··missing@1.0.0',
        location: './node_modules/.vlt/··missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      },
      Edge spec(pnpmdep@1) -prod-> to: Node {
        id: '··pnpmdep@1.0.0',
        location: './node_modules/.vlt/··pnpmdep@1.0.0/node_modules/pnpmdep',
        resolved: 'https://registry.npmjs.org/pnpmdep/-/pnpmdep-1.0.0.tgz'
      },
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '··baz@1.0.0',
        location: './node_modules/.vlt/··baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      },
      Edge spec(ipsum@github:lorem/ipsum) -prod-> to: Node {
        id: 'git·github%3Alorem§ipsum·',
        location: './node_modules/.vlt/git·github%3Alorem§ipsum·/node_modules/ipsum',
        resolved: 'github:lorem/ipsum'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from an actual graph > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file·linked', location: './linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo'
      },
      Edge spec(aliased@custom:foo@^1.0.0) -dev-> to: Node {
        id: '·custom·foo@1.0.0',
        location: './node_modules/.vlt/·custom·foo@1.0.0/node_modules/foo',
        dev: true
      },
      Edge spec(@scoped/b@^1.0.0) -prod-> to: Node {
        id: '··@scoped§b@1.0.0',
        location: './node_modules/.vlt/··@scoped§b@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@^1.0.0) -prod-> to: Node {
            id: '··@scoped§c@1.0.0',
            location: './node_modules/.vlt/··@scoped§c@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@^1.0.0) -prod-> to: Node {
        id: '··@scoped§a@1.0.0',
        location: './node_modules/.vlt/··@scoped§a@1.0.0/node_modules/@scoped/a'
      },
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: '··missing@1.0.0',
        location: './node_modules/.vlt/··missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      },
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '··baz@1.0.0',
        location: './node_modules/.vlt/··baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  },
  Node {
    id: 'workspace·packages§workspace-b',
    location: './packages/workspace-b',
    importer: true,
    edgesOut: [ Edge spec(baz@^1.0.0) -prod-> to: Node { ref: '··baz@1.0.0' } ]
  },
  Node {
    id: 'workspace·packages§workspace-a',
    location: './packages/workspace-a',
    importer: true,
    edgesOut: [
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { ref: 'workspace·packages§workspace-b' },
      Edge spec(ipsum@^1.0.0) -dev-> to: Node {
        id: '··ipsum@1.0.0',
        location: './node_modules/.vlt/··ipsum@1.0.0/node_modules/ipsum',
        dev: true
      },
      Edge spec(foo@^1.0.0) -dev-> to: Node { ref: '··foo@1.0.0' }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > remove from manifest file only > must match snapshot 1`] = `
[ Node { id: 'file·.', location: '.', importer: true } ]
`
