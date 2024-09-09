/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/append-nodes.ts > TAP > append different type of dependencies > should install different type of deps on different conditions 1`] = `
@vltpkg/graph.Graph {
  registries: {},
  nodes: { ';;bar@1.0.0': [ 1, 'bar' ], ';;foo@1.0.0': [ 2, 'foo' ] },
  edges: {
    'file;. foo': 'dev ^1.0.0 ;;foo@1.0.0',
    'file;. bar': 'optional ^1.0.0 ;;bar@1.0.0'
  }
}
`

exports[`test/ideal/append-nodes.ts > TAP > append file type of nodes > should have a graph with file type dependencies 1`] = `
[
  Node {
    id: 'file;.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node { id: 'file;linked', location: 'linked', resolved: 'linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: ';;foo@1.0.0',
        location: './node_modules/.vlt/;;foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        edgesOut: [
          Edge spec(bar@file:./bar) -prod-> to: Node {
            id: 'file;node_modules%2F.vlt%2F%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbar',
            location: './node_modules/.vlt/file;node_modules%2F.vlt%2F%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbar/node_modules/bar',
            resolved: 'node_modules/.vlt/;;foo@1.0.0/node_modules/foo/bar'
          },
          Edge spec(baz@file:./baz.tgz) -prod-> to: Node {
            id: 'file;node_modules%2F.vlt%2F%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbaz.tgz',
            location: './node_modules/.vlt/file;node_modules%2F.vlt%2F%3B%3Bfoo@1.0.0%2Fnode_modules%2Ffoo%2Fbaz.tgz/node_modules/baz',
            resolved: 'node_modules/.vlt/;;foo@1.0.0/node_modules/foo/baz.tgz'
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/append-nodes.ts > TAP > resolve against the correct registries > must match snapshot 1`] = `
@vltpkg/graph.Graph {
  registries: {},
  nodes: {
    ';a;bar@1.2.3': [ 0, 'bar' ],
    ';a;x@1.99.99': [ 0, 'x' ],
    ';a;y@1.99.99': [ 0, 'y' ],
    ';b;baz@1.2.3': [ 0, 'baz' ],
    ';b;x@1.99.99': [ 0, 'x' ],
    ';b;y@1000.0.0': [ 0, 'y' ]
  },
  edges: {
    'file;. bar': 'prod a:bar@1.x ;a;bar@1.2.3',
    'file;. baz': 'prod b:bar@1.x ;b;baz@1.2.3',
    ';a;bar@1.2.3 x': 'prod 1.x ;a;x@1.99.99',
    ';a;x@1.99.99 y': 'prod 1 ;a;y@1.99.99',
    ';b;baz@1.2.3 x': 'prod 1.x ;b;x@1.99.99',
    ';b;x@1.99.99 y': 'prod 1000 ;b;y@1000.0.0'
  }
}
`
