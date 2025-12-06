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
        id: '·npm·a@1.0.0',
        location: './node_modules/.vlt/·npm·a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@^1.0.0) -prod-> to: Node {
            id: '·npm·b@1.0.0',
            location: './node_modules/.vlt/·npm·b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@^1.0.0) -prod-> to: Node { ref: '·npm·a@1.0.0' } ]
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
        id: '·npm·a@1.0.0',
        location: './node_modules/.vlt/·npm·a@1.0.0/node_modules/a',
        edgesOut: [
          Edge spec(b@1.0.0) -prod-> to: Node {
            id: '·npm·b@1.0.0',
            location: './node_modules/.vlt/·npm·b@1.0.0/node_modules/b',
            edgesOut: [ Edge spec(a@1.0.0) -prod-> to: Node { ref: '·npm·a@1.0.0' } ]
          }
        ]
      }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > extra parameter in DepID > should preserve extra parameters in DepIDs when loading the graph 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(d@file:./packages/d) -prod-> to: Node { id: 'file·packages§d', location: './packages/d' },
      Edge spec(c@^1.0.0) -prod-> to: Node {
        id: '·npm·c@1.0.0·%3Aroot%20%3E%20%23c%20%3E%20%23d',
        location: './node_modules/.vlt/·npm·c@1.0.0·%3Aroot%20%3E%20%23c%20%3E%20%23d/node_modules/c'
      },
      Edge spec(b@^1.0.0) -prod-> to: Node {
        id: '·npm·b@1.0.0·%3Aroot%20%3E%20%23b',
        location: './node_modules/.vlt/·npm·b@1.0.0·%3Aroot%20%3E%20%23b/node_modules/b'
      },
      Edge spec(a@^1.0.0) -prod-> to: Node {
        id: '·npm·a@1.0.0',
        location: './node_modules/.vlt/·npm·a@1.0.0/node_modules/a'
      }
    ]
  }
]
`

exports[`test/actual/load.ts > TAP > getPathBasedId > should get path based id for various dep ids 1`] = `
Array [
  "·npm·foo@1.0.0",
  "·npm·foo@1.0.0·deadbeef",
  "git·github%3Aa§b·",
  "git·github%3Aa§b··deadbeef",
  "file·foo",
  "file·foo",
  "workspace·packages§a",
  "workspace·packages§a",
  "remote·https%3A§§example.com§x.tgz",
  "remote·https%3A§§example.com§x.tgz·deadbeef",
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
        id: '·npm·foo@1.0.0',
        location: './node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@*) -prod-> to: Node {
        id: '·npm·extraneous@1.0.0',
        location: './node_modules/.vlt/·npm·extraneous@1.0.0/node_modules/extraneous'
      },
      Edge spec(bar@^1.0.0) -optional-> to: Node {
        id: '·npm·bar@1.0.0',
        location: './node_modules/.vlt/·npm·bar@1.0.0/node_modules/bar',
        optional: true,
        edgesOut: [
          Edge spec(blooo@1) -prod-> to: Node {
            id: '·npm·blooo@1.0.0',
            location: './node_modules/.vlt/·npm·blooo@1.0.0/node_modules/blooo',
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
        id: '·npm·@scoped§b@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§b@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@^1.0.0) -prod-> to: Node {
            id: '·npm·@scoped§c@1.0.0',
            location: './node_modules/.vlt/·npm·@scoped§c@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@^1.0.0) -prod-> to: Node {
        id: '·npm·@scoped§a@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§a@1.0.0/node_modules/@scoped/a'
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
        id: '·npm·ipsum@1.0.0',
        location: './node_modules/.vlt/·npm·ipsum@1.0.0/node_modules/ipsum',
        dev: true
      },
      Edge spec(foo@^1.0.0) -dev-> to: Node { ref: '·npm·foo@1.0.0' }
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
        id: '·npm·foo@1.0.0',
        location: './node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo'
      },
      Edge spec(extraneous@1.0.0) -prod-> to: Node {
        id: '·npm·extraneous@1.0.0',
        location: './node_modules/.vlt/·npm·extraneous@1.0.0/node_modules/extraneous'
      },
      Edge spec(bar@1.0.0) -prod-> to: Node {
        id: '·npm·bar@1.0.0',
        location: './node_modules/.vlt/·npm·bar@1.0.0/node_modules/bar',
        edgesOut: [
          Edge spec(blooo@1.0.0) -prod-> to: Node {
            id: '·npm·blooo@1.0.0',
            location: './node_modules/.vlt/·npm·blooo@1.0.0/node_modules/blooo'
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
        id: '·npm·@scoped§b@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§b@1.0.0/node_modules/@scoped/b',
        edgesOut: [
          Edge spec(@scoped/c@1.0.0) -prod-> to: Node {
            id: '·npm·@scoped§c@1.0.0',
            location: './node_modules/.vlt/·npm·@scoped§c@1.0.0/node_modules/@scoped/c'
          }
        ]
      },
      Edge spec(@scoped/a@1.0.0) -prod-> to: Node {
        id: '·npm·@scoped§a@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§a@1.0.0/node_modules/@scoped/a'
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
        id: '·npm·ipsum@1.0.0',
        location: './node_modules/.vlt/·npm·ipsum@1.0.0/node_modules/ipsum'
      },
      Edge spec(foo@1.0.0) -prod-> to: Node { ref: '·npm·foo@1.0.0' }
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

exports[`test/actual/load.ts > TAP > various DepID types with peerSetHash > should load graph with various DepID types and peerSetHash 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(e@workspace:*) -prod-> to: Node { id: 'workspace·packages§e', location: './packages/e' },
      Edge spec(d@file:./packages/d) -prod-> to: Node { id: 'file·packages§d', location: './packages/d' },
      Edge spec(c@https://example.com/pkg.tgz) -prod-> to: Node {
        id: 'remote·https%3A§§example.com§pkg.tgz·%E1%B9%97%3A1',
        location: './node_modules/.vlt/remote·https%3A§§example.com§pkg.tgz·%E1%B9%97%3A1/node_modules/c'
      },
      Edge spec(b@github:user/repo) -prod-> to: Node {
        id: 'git·github%3Auser§repo·main·%E1%B9%97%3A1',
        location: './node_modules/.vlt/git·github%3Auser§repo·main·%E1%B9%97%3A1/node_modules/b'
      },
      Edge spec(a@^1.0.0) -prod-> to: Node {
        id: '·npm·a@1.0.0·%3Aroot%20%3E%20%23a%E1%B9%97%3A1',
        location: './node_modules/.vlt/·npm·a@1.0.0·%3Aroot%20%3E%20%23a%E1%B9%97%3A1/node_modules/a'
      }
    ]
  }
]
`
