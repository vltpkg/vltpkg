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

exports[`test/ideal/append-nodes.ts > TAP > append different type of dependencies > should install different type of deps on different conditions 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 1,
  options: { registries: {} },
  nodes: {
    '~npm~bar@1.0.0': [ 1, 'bar', <3 empty items>, { name: 'bar', version: '1.0.0' } ],
    '~npm~foo@1.0.0': [
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
    'file~_d foo': 'dev ^1.0.0 ~npm~foo@1.0.0',
    'file~_d bar': 'optional ^1.0.0 ~npm~bar@1.0.0'
  }
}
`

exports[`test/ideal/append-nodes.ts > TAP > append file type of nodes > should have a graph with file type dependencies 1`] = `
[
  Node {
    id: 'file~_d',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(linked@file:./linked) -prod-> to: Node { id: 'file~linked', location: 'linked', resolved: 'linked' },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '~npm~foo@1.0.0',
        location: './node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        edgesOut: [
          Edge spec(bar@file:./bar) -prod-> to: Node {
            id: 'file~node__modules+.vlt+_tnpm_tfoo@1.0.0+node__modules+foo+bar',
            location: './node_modules/.vlt/file~node__modules+.vlt+_tnpm_tfoo@1.0.0+node__modules+foo+bar/node_modules/bar',
            resolved: 'node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/bar'
          },
          Edge spec(baz@file:./baz.tgz) -prod-> to: Node {
            id: 'file~node__modules+.vlt+_tnpm_tfoo@1.0.0+node__modules+foo+baz.tgz',
            location: './node_modules/.vlt/file~node__modules+.vlt+_tnpm_tfoo@1.0.0+node__modules+foo+baz.tgz/node_modules/baz',
            resolved: 'node_modules/.vlt/~npm~foo@1.0.0/node_modules/foo/baz.tgz'
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/append-nodes.ts > TAP > inject transient dependencies from transientAdd > graph should match snapshot 1`] = `
flowchart TD
a("root:my-project")
a -->|"foo#64;file:./foo"| b("file(foo):foo#64;1.0.0")
b -->|"bar#64;^1.0.0"| c("npm:bar#64;1.0.0")
b -->|"baz#64;^2.0.0"| d("npm:baz#64;2.0.0")
b -->|"lorem#64;^3.0.0 (peer)"| e("npm:lorem#64;3.0.0")
`

exports[`test/ideal/append-nodes.ts > TAP > resolve against the correct registries > must match snapshot 1`] = `
@vltpkg/graph.Graph {
  lockfileVersion: 1,
  options: {
    registries: { a: 'https://a.example.com/', b: 'https://b.example.com/' }
  },
  nodes: {
    '~a~bar@1.2.3': [
      0,
      'bar',
      <3 empty items>,
      { name: 'bar', version: '1.2.3', dependencies: { x: '1.x' } }
    ],
    '~a~x@1.99.99': [
      0,
      'x',
      <3 empty items>,
      {
        name: 'x',
        version: '1.99.99',
        description: 'x on a',
        dependencies: { y: '1' }
      }
    ],
    '~a~y@1.99.99': [ 0, 'y', <3 empty items>, { name: 'y', version: '1.99.99' } ],
    '~b~baz@1.2.3': [
      0,
      'baz',
      <3 empty items>,
      { name: 'baz', version: '1.2.3', dependencies: { x: '1.x' } }
    ],
    '~b~x@1.1.1': [
      0,
      'x',
      <3 empty items>,
      {
        name: 'x',
        version: '1.1.1',
        description: 'x on b',
        dependencies: { y: '1000' }
      }
    ],
    '~b~y@1000.0.0': [ 0, 'y', <3 empty items>, { name: 'y', version: '1000.0.0' } ]
  },
  edges: {
    'file~_d bar': 'prod a:bar@1.x ~a~bar@1.2.3',
    'file~_d baz': 'prod b:baz@1.x ~b~baz@1.2.3',
    '~a~bar@1.2.3 x': 'prod 1.x ~a~x@1.99.99',
    '~a~x@1.99.99 y': 'prod 1 ~a~y@1.99.99',
    '~b~baz@1.2.3 x': 'prod 1.x ~b~x@1.1.1',
    '~b~x@1.1.1 y': 'prod 1000 ~b~y@1000.0.0'
  }
}
`
