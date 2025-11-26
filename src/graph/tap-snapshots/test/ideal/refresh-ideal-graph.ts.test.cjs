/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph > graph after adding a previously missing dependency bar 1`] = `
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
        edgesOut: [
          Edge spec(bar@^1.0.0) -prod-> to: Node {
            id: '··bar@1.0.0',
            location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
            resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
          }
        ]
      },
      Edge spec(bar@^1.0.0) -prod-> to: Node { ref: '··bar@1.0.0' }
    ]
  }
]
`

exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph > graph after adding foo when there is an already existing foo 1`] = `
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
        edgesOut: [
          Edge spec(bar@^1.0.0) -prod-> to: Node {
            id: '··bar@1.0.0',
            location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
            resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph > graph with an added foo 1`] = `
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
        edgesOut: [
          Edge spec(bar@^1.0.0) -prod-> to: Node {
            id: '··bar@1.0.0',
            location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
            resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph > graph with missing package bar 1`] = `
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
        edgesOut: [
          Edge spec(bar@^1.0.0) -prod-> to: Node {
            id: '··bar@1.0.0',
            location: './node_modules/.vlt/··bar@1.0.0/node_modules/bar',
            resolved: 'https://registry.npmjs.org/bar/-/bar-1.0.0.tgz'
          }
        ]
      },
      Edge spec(bar@^1.0.0) -prod-> to: [missing package]: <bar@^1.0.0>
    ]
  }
]
`

exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph > initial graph 1`] = `
[ Node { id: 'file·.', location: '.', importer: true } ]
`

exports[`test/ideal/refresh-ideal-graph.ts > TAP > refreshIdealGraph with workspaces > graph with workspace changes 1`] = `
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
  },
  Node {
    id: 'workspace·packages§workspace-c',
    location: './packages/workspace-c',
    importer: true,
    edgesOut: [
      Edge spec(lorem@^1.0.0) -peer-> to: Node {
        id: '··lorem@1.0.0',
        location: './node_modules/.vlt/··lorem@1.0.0/node_modules/lorem',
        resolved: 'https://registry.npmjs.org/lorem/-/lorem-1.0.0.tgz'
      }
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
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
      },
      Edge spec(qux@^1.0.0) -dev-> to: Node {
        id: '··qux@1.0.0',
        location: './node_modules/.vlt/··qux@1.0.0/node_modules/qux',
        dev: true,
        resolved: 'https://registry.npmjs.org/qux/-/qux-1.0.0.tgz'
      }
    ]
  }
]
`
