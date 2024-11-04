/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/append-nodes.ts > TAP > append different type of dependencies > should install different type of deps on different conditions 1`] = `
@vltpkg/graph.Graph {
  options: { registries: {} },
  nodes: {
    '··bar@1.0.0': [ 1, 'bar', <3 empty items>, { name: 'bar', version: '1.0.0' } ],
    '··foo@1.0.0': [
      2,
      'foo',
      <3 empty items>,
      {
        name: 'foo',
        version: '1.0.0',
        devDependencies: { baz: '^1.0.0' }
      }
    ]
  },
  edges: {
    'file·. foo': 'dev ^1.0.0 ··foo@1.0.0',
    'file·. bar': 'optional ^1.0.0 ··bar@1.0.0'
  }
}
`

exports[`test/ideal/append-nodes.ts > TAP > append file type of nodes > should have a graph with file type dependencies 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node { id: 'file·linked', location: 'linked', resolved: 'linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '··foo@1.0.0',
        location: './node_modules/.vlt/··foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        edgesOut: [
          Edge spec(bar@file:./bar) -prod-> to: Node {
            id: 'file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§bar',
            location: './node_modules/.vlt/file·node_modules§.vlt§%C2%B7%C2%B7foo@1.0.0§node_modules§foo§bar/node_modules/bar',
            resolved: 'node_modules/.vlt/··foo@1.0.0/node_modules/foo/bar'
          },
          Edge spec(baz@file:./baz.tgz) -prod-> to: Node {
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
    '·b·baz@1.2.3': [ 0, 'baz', <3 empty items>, [Object] ],
    '·b·x@1.99.99': [ 0, 'x', <3 empty items>, [Object] ],
    '·b·y@1000.0.0': [ 0, 'y', <3 empty items>, [Object] ]
  },
  edges: {
    'file·. bar': 'prod a:bar@1.x ·a·bar@1.2.3',
    'file·. baz': 'prod b:bar@1.x ·b·baz@1.2.3',
    '·a·bar@1.2.3 x': 'prod 1.x ·a·x@1.99.99',
    '·a·x@1.99.99 y': 'prod 1 ·a·y@1.99.99',
    '·b·baz@1.2.3 x': 'prod 1.x ·b·x@1.99.99',
    '·b·x@1.99.99 y': 'prod 1000 ·b·y@1000.0.0'
  }
}
`
