/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/visualization/human-readable-output.ts > TAP > cycle > should print cycle human readable output 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
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

exports[`test/visualization/human-readable-output.ts > TAP > human-readable-output > should print human readable output 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: 'registry;;foo@1.0.0',
        location: './node_modules/.vlt/registry;;foo@1.0.0/node_modules/foo'
      },
      Edge spec(bar@^1.0.0) -prod-> to: Node {
        id: 'registry;;bar@1.0.0',
        location: './node_modules/.vlt/registry;;bar@1.0.0/node_modules/bar',
        edgesOut: [
          Edge spec(baz@custom:bar@^1.0.0) -prod-> to: Node {
            id: 'registry;custom;baz@1.0.0',
            location: './node_modules/.vlt/registry;custom;baz@1.0.0/node_modules/baz',
            resolved: 'http://example.com/baz',
            integrity: 'sha512-deadbeef',
            edgesOut: [
              Edge spec(foo@^1.0.0) -prod-> to: Node { ref: 'registry;;foo@1.0.0' }
            ]
          },
          Edge spec(extraneous@extraneous@^1.0.0) -prod-> to: [extraneous package]: <extraneous>
        ]
      },
      Edge spec(missing@^1.0.0) -prod-> to: [missing package]: <missing@^1.0.0>
    ]
  }
]
`

exports[`test/visualization/human-readable-output.ts > TAP > workspaces > should print human readable workspaces output 1`] = `
[
  Node { id: 'file;.', location: '.', importer: true },
  Node {
    id: 'workspace;packages%2Fb',
    location: './packages/b',
    importer: true
  },
  Node {
    id: 'workspace;packages%2Fa',
    location: './packages/a',
    importer: true
  }
]
`
