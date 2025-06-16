/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/append-nodes.ts > TAP > append a new node to a graph from a registry > should have fixed the spec name for the nameless git dep 1`] = `
Array [
  Array [
    "foo",
    Object {
      "spec": "foo@^1.0.0",
      "type": "prod",
    },
  ],
  Array [
    "bar",
    Object {
      "spec": "bar@",
      "type": "prod",
    },
  ],
  Array [
    "borked",
    Object {
      "spec": "borked@",
      "type": "prod",
    },
  ],
  Array [
    "ipsum",
    Object {
      "spec": "ipsum@github:lorem/ipsum",
      "type": "prod",
    },
  ],
]
`

exports[`test/ideal/append-nodes.ts > TAP > append file type of nodes > should have a graph with file type dependencies 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -linked@file:./linked-> to: Node { id: 'file·linked', location: 'linked', resolved: 'linked' },
      Edge spec(foo@^1.0.0) -foo@^1.0.0-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        edgesOut: [
          Edge spec(bar@file:./bar) -bar@file:./bar-> to: Node {
            id: 'file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§bar',
            location: './node_modules/.vlt/file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§bar/node_modules/bar',
            resolved: 'node_modules/.vlt/··foo@1.0.0/node_modules/foo/bar'
          },
          Edge spec(baz@file:./baz.tgz) -baz@file:./baz.tgz-> to: Node {
            id: 'file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§baz.tgz',
            location: './node_modules/.vlt/file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§baz.tgz/node_modules/baz',
            resolved: 'node_modules/.vlt/··foo@1.0.0/node_modules/foo/baz.tgz'
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/append-nodes.ts > TAP > resolve against the correct registries > must match snapshot 1`] = `
@vltpkg/graph.Graph {
  options: {
    registries: { a: 'https://a.example.com/', b: 'https://b.example.com/' }
  },
  nodes: {
    '·a·bar@1.2.3': [ 0, 'bar', <3 empty items>, [Object] ],
    '·a·x@1.99.99': [ 0, 'x', <3 empty items>, [Object] ],
    '·a·y@1.99.99': [ 0, 'y', <3 empty items>, [Object] ],
    '·b·baz@1.2.3': [ 0, 'bar', <3 empty items>, [Object], [Object] ],
    '·b·x@1.99.99': [ 0, 'x', <3 empty items>, [Object] ],
    '·b·y@1000.0.0': [ 0, 'y', <3 empty items>, [Object] ]
  },
  edges: {
    'file·. bar': 'bar@1.x 1.x ·b·baz@1.2.3',
    '·a·bar@1.2.3 x': 'x@1.x 1.x ·a·x@1.99.99',
    '·a·x@1.99.99 y': 'y@1 1 ·a·y@1.99.99',
    '·b·baz@1.2.3 x': 'x@1.x 1.x ·b·x@1.99.99',
    '·b·x@1.99.99 y': 'y@1000 1000 ·b·y@1000.0.0'
  }
}
`
