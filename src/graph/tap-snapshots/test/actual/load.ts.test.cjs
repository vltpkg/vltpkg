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
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(a@^1.0.0) -prod-> to: Node {
        id: '··a@1.0.0',
        location: './node_modules/.vlt/··a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@^1.0.0) -prod-> to: Node {
            id: '··b@1.0.0',
            location: './node_modules/.vlt/··b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@^1.0.0) -prod-> to: Node { ref: '··a@1.0.0' } ]
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
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(a@1.0.0) -prod-> to: Node {
        id: '··a@1.0.0',
        location: './node_modules/.vlt/··a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@1.0.0) -prod-> to: Node {
            id: '··b@1.0.0',
            location: './node_modules/.vlt/··b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@1.0.0) -prod-> to: Node { ref: '··a@1.0.0' } ]
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
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file·linked', location: './linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@*) -prod-> to: Node {
        id: '··extraneous@1.0.0',
        location: './node_modules/.vlt/··extraneous@1.0.0/node_modules/extraneous'
      },
      Edge spec(bar@^1.0.0) -optional-> to: Node {
        id: '··bar@1.0.0',
        location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
        optional: true,
        edgesOut: [
          Edge spec(blooo@1) -prod-> to: Node {
            id: '··blooo@1.0.0',
            location: './node_modules/.vlt/··blooo@1.0.0/node_modules/blooo',
            optional: true
          },
          Edge spec(baz@custom:baz@^1.0.0) -prod-> to: Node {
            id: '·custom·baz@1.0.0',
            location: './node_modules/.vlt/·custom·baz@1.0.0/node_modules/baz',
            optional: true
          }
        ]
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
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  },
  Node {
    id: 'workspace·packages§workspace-b',
    location: './packages/workspace-b',
    importer: true
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

exports[`test/actual/load.ts > TAP > load actual > should load an actual graph without any manifest info 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file·linked', location: './linked' },
      Edge spec(foo@1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@1.0.0) -prod-> to: Node {
        id: '··extraneous@1.0.0',
        location: './node_modules/.vlt/··extraneous@1.0.0/node_modules/extraneous'
      },
      Edge spec(bar@1.0.0) -prod-> to: Node {
        id: '··bar@1.0.0',
        location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
        edgesOut: [
          Edge spec(blooo@1.0.0) -prod-> to: Node {
            id: '··blooo@1.0.0',
            location: './node_modules/.vlt/··blooo@1.0.0/node_modules/blooo'
          },
          Edge spec(baz@custom:baz@1.0.0) -prod-> to: Node {
            id: '·custom·baz@1.0.0',
            location: './node_modules/.vlt/·custom·baz@1.0.0/node_modules/baz'
          }
        ]
      },
      Edge spec(aliased@custom:foo@1.0.0) -prod-> to: Node {
        id: '·custom·foo@1.0.0',
        location: './node_modules/.vlt/·custom·foo@1.0.0/node_modules/foo'
      },
      Edge spec(@scoped/b@1.0.0) -prod-> to: Node {
        id: '··@scoped§b@1.0.0',
        location: './node_modules/.vlt/··@scoped§b@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@1.0.0) -prod-> to: Node {
            id: '··@scoped§c@1.0.0',
            location: './node_modules/.vlt/··@scoped§c@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@1.0.0) -prod-> to: Node {
        id: '··@scoped§a@1.0.0',
        location: './node_modules/.vlt/··@scoped§a@1.0.0/node_modules/@scoped/a'
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  },
  Node {
    id: 'workspace·packages§workspace-b',
    location: './packages/workspace-b',
    importer: true
  },
  Node {
    id: 'workspace·packages§workspace-a',
    location: './packages/workspace-a',
    importer: true,
    edgesOut: [
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { ref: 'workspace·packages§workspace-b' },
      Edge spec(ipsum@1.0.0) -prod-> to: Node {
        id: '··ipsum@1.0.0',
        location: './node_modules/.vlt/··ipsum@1.0.0/node_modules/ipsum'
      },
      Edge spec(foo@1.0.0) -prod-> to: Node { ref: '··foo@1.0.0' }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > uninstalled dependencies > should load an actual graph with missing deps with manifest info 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [ Edge spec(a@^1.0.0) -prod-> to: [missing package]: <a@^1.0.0> ]
  }
]
`

exports[`test/actual/load.ts > TAP > uninstalled dependencies > should load an actual graph with missing deps with no manifest info 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [ Edge spec(a@^1.0.0) -prod-> to: [missing package]: <a@^1.0.0> ]
  }
]
`
