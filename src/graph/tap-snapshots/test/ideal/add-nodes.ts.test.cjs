/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/add-nodes.ts > TAP > addNodes > graph after adding a previously missing dependency bar 1`] = `
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

exports[`test/ideal/add-nodes.ts > TAP > addNodes > graph after adding foo when there is an already existing foo 1`] = `
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

exports[`test/ideal/add-nodes.ts > TAP > addNodes > graph with an added foo 1`] = `
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

exports[`test/ideal/add-nodes.ts > TAP > addNodes > graph with missing package bar 1`] = `
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

exports[`test/ideal/add-nodes.ts > TAP > addNodes > initial graph 1`] = `
[ Node { id: 'file·.', location: '.', importer: true } ]
`
