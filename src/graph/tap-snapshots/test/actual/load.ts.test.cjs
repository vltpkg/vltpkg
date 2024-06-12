/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/actual/load.ts > TAP > cycle > should load an actual graph with cycle containing missing deps info 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    edgesOut: [
      Edge spec(a@^1.0.0) -prod-> to: Node {
        id: 'registry;;a@1.0.0',
        location: './node_modules/.vlt/registry;;a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@^1.0.0) -prod-> to: Node {
            id: 'registry;;b@1.0.0',
            location: './node_modules/.vlt/registry;;b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@^1.0.0) -prod-> to: Node { ref: 'registry;;a@1.0.0' } ]
          }
        ]
      }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > cycle > should load an actual graph with cycle without any manifest info 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    edgesOut: [
      Edge spec(a@1.0.0) -prod-> to: Node {
        id: 'registry;;a@1.0.0',
        location: './node_modules/.vlt/registry;;a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@1.0.0) -prod-> to: Node {
            id: 'registry;;b@1.0.0',
            location: './node_modules/.vlt/registry;;b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@1.0.0) -prod-> to: Node { ref: 'registry;;a@1.0.0' } ]
          }
        ]
      }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > load actual > should load an actual graph containing missing deps info 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file;.%2Flinked', location: './linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@*) -prod-> to: [extraneous package]: <extraneous>,
      Edge spec(bar@^1.0.0) -prod-> to: Node {
        id: 'registry;;bar@1.0.0',
        location: './node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
        edgesOut: [
          Edge spec(baz@custom:baz@^1.0.0) -prod-> to: Node {
            id: 'registry;custom;baz@1.0.0',
            location: './node_modules/.vlt/registry;custom;baz@1.0.0/node_modules/baz'
          }
        ]
      },
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
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  },
  Node {
    id: 'workspace;packages%2Fworkspace-b',
    location: './packages/workspace-b'
  },
  Node {
    id: 'workspace;packages%2Fworkspace-a',
    location: './packages/workspace-a',
    edgesOut: [
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { id: 'workspace;workspace-b', location: './packages/workspace-b' },
      Edge spec(ipsum@^1.0.0) -dev-> to: Node {
        id: 'registry;;ipsum@1.0.0',
        location: './node_modules/.vlt/registry;;ipsum@1.0.0/node_modules/ipsum'
      },
      Edge spec(foo@^1.0.0) -dev-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > load actual > should load an actual graph without any manifest info 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file;.%2Flinked', location: './linked' },
      Edge spec(foo@1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@1.0.0) -prod-> to: Node {
        id: 'registry;;extraneous@1.0.0',
        location: './node_modules/.vlt/registry;;extraneous@1.0.0/node_modules/extraneous'
      },
      Edge spec(bar@1.0.0) -prod-> to: Node {
        id: 'registry;;bar@1.0.0',
        location: './node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
        edgesOut: [
          Edge spec(baz@custom:baz@1.0.0) -prod-> to: Node {
            id: 'registry;custom;baz@1.0.0',
            location: './node_modules/.vlt/registry;custom;baz@1.0.0/node_modules/baz'
          }
        ]
      },
      Edge spec(aliased@custom:foo@1.0.0) -prod-> to: Node {
        id: 'registry;custom;foo@1.0.0',
        location: './node_modules/.vlt/registry;custom;foo@1.0.0/node_modules/foo'
      },
      Edge spec(@scoped/b@1.0.0) -prod-> to: Node {
        id: 'registry;;@scoped%2Fb@1.0.0',
        location: './node_modules/.vlt/registry;;@scoped%2Fb@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@1.0.0) -prod-> to: Node {
            id: 'registry;;@scoped%2Fc@1.0.0',
            location: './node_modules/.vlt/registry;;@scoped%2Fc@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@1.0.0) -prod-> to: Node {
        id: 'registry;;@scoped%2Fa@1.0.0',
        location: './node_modules/.vlt/registry;;@scoped%2Fa@1.0.0/node_modules/@scoped/a'
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  },
  Node {
    id: 'workspace;packages%2Fworkspace-b',
    location: './packages/workspace-b'
  },
  Node {
    id: 'workspace;packages%2Fworkspace-a',
    location: './packages/workspace-a',
    edgesOut: [
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { id: 'workspace;workspace-b', location: './packages/workspace-b' },
      Edge spec(ipsum@1.0.0) -prod-> to: Node {
        id: 'registry;;ipsum@1.0.0',
        location: './node_modules/.vlt/registry;;ipsum@1.0.0/node_modules/ipsum'
      },
      Edge spec(foo@1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      }
    ]
  }
]
`
