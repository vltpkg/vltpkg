/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > add from manifest file only > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '·npm·baz@1.0.0',
        location: './node_modules/.vlt/·npm·baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from a virtual graph > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '·npm·baz@1.0.0',
        location: './node_modules/.vlt/·npm·baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '·npm·foo@1.0.0',
        location: './node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      },
      Edge spec(ipsum@github:lorem/ipsum) -prod-> to: Node {
        id: 'git·github%3Alorem§ipsum·',
        location: './node_modules/.vlt/git·github%3Alorem§ipsum·/node_modules/ipsum',
        resolved: 'github:lorem/ipsum'
      },
      Edge spec(linked@file:./linked) -prod-> to: Node { id: 'file·linked', location: 'linked', resolved: 'linked' },
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: '·npm·missing@1.0.0',
        location: './node_modules/.vlt/·npm·missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      },
      Edge spec(pnpmdep@1) -prod-> to: Node {
        id: '·npm·pnpmdep@1.0.0',
        location: './node_modules/.vlt/·npm·pnpmdep@1.0.0/node_modules/pnpmdep',
        resolved: 'https://registry.npmjs.org/pnpmdep/-/pnpmdep-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > build from an actual graph > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(@scoped/a@^1.0.0) -prod-> to: Node {
        id: '·npm·@scoped§a@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§a@1.0.0/node_modules/@scoped/a',
        resolved: 'https://registry.npmjs.org/@scoped/a/-/a-1.0.0.tgz'
      },
      Edge spec(@scoped/b@^1.0.0) -prod-> to: Node {
        id: '·npm·@scoped§b@1.0.0',
        location: './node_modules/.vlt/·npm·@scoped§b@1.0.0/node_modules/@scoped/b',
        resolved: 'https://registry.npmjs.org/@scoped/b/-/b-1.0.0.tgz',
        edgesOut: [
          Edge spec(@scoped/c@^1.0.0) -prod-> to: Node {
            id: '·npm·@scoped§c@1.0.0',
            location: './node_modules/.vlt/·npm·@scoped§c@1.0.0/node_modules/@scoped/c',
            resolved: 'https://registry.npmjs.org/@scoped/c/-/c-1.0.0.tgz'
          }
        ]
      },
      Edge spec(baz@custom:baz@^1.0.0) -prod-> to: Node {
        id: '·custom·baz@1.0.0',
        location: './node_modules/.vlt/·custom·baz@1.0.0/node_modules/baz',
        resolved: 'http://example.com/baz/-/baz-1.0.0.tgz'
      },
      Edge spec(aliased@custom:foo@^1.0.0) -dev-> to: Node {
        id: '·custom·foo@1.0.0',
        location: './node_modules/.vlt/·custom·foo@1.0.0/node_modules/foo',
        dev: true,
        resolved: 'http://example.com/foo/-/foo-1.0.0.tgz'
      },
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '·npm·foo@1.0.0',
        location: './node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'
      },
      Edge spec(link@file:./linked) -prod-> to: Node { id: 'file·linked', location: 'linked', resolved: 'linked' },
      Edge spec(missing@^1.0.0) -prod-> to: Node {
        id: '·npm·missing@1.0.0',
        location: './node_modules/.vlt/·npm·missing@1.0.0/node_modules/missing',
        resolved: 'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz'
      }
    ]
  },
  Node {
    id: 'workspace·packages§workspace-b',
    location: './packages/workspace-b',
    importer: true,
    edgesOut: [
      Edge spec(baz@^1.0.0) -prod-> to: Node {
        id: '·npm·baz@1.0.0',
        location: './node_modules/.vlt/·npm·baz@1.0.0/node_modules/baz',
        resolved: 'https://registry.npmjs.org/baz/-/baz-1.0.0.tgz'
      }
    ]
  },
  Node {
    id: 'workspace·packages§workspace-a',
    location: './packages/workspace-a',
    importer: true,
    edgesOut: [
      Edge spec(foo@^1.0.0) -dev-> to: Node { ref: '·npm·foo@1.0.0' },
      Edge spec(workspace-b@workspace:*) -dev-> to: Node { ref: 'workspace·packages§workspace-b' },
      Edge spec(ipsum@^1.0.0) -dev-> to: Node {
        id: '·npm·ipsum@1.0.0',
        location: './node_modules/.vlt/·npm·ipsum@1.0.0/node_modules/ipsum',
        dev: true,
        resolved: 'https://registry.npmjs.org/ipsum/-/ipsum-1.0.0.tgz'
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > optional subdeps binary distribution strategy > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(esbuild@*) -prod-> to: Node {
        id: '·npm·esbuild@0.25.11',
        location: './node_modules/.vlt/·npm·esbuild@0.25.11/node_modules/esbuild',
        resolved: 'https://registry.npmjs.org/esbuild/-/esbuild-0.25.11.tgz',
        edgesOut: [
          Edge spec(@esbuild/darwin-arm64@0.25.11) -optional-> to: Node {
            id: '·npm·@esbuild§darwin-arm64@0.25.11',
            location: './node_modules/.vlt/·npm·@esbuild§darwin-arm64@0.25.11/node_modules/@esbuild/darwin-arm64',
            optional: true,
            resolved: 'https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.11.tgz',
            integrity: 'sha512-VekY0PBCukppoQrycFxUqkCojnTQhdec0vevUL/EDOCnXd9LKWqD/bHwMPzigIJXPhC59Vd1WFIL57SKs2mg4w=='
          },
          Edge spec(@esbuild/linux-x64@0.25.11) -optional-> to: Node {
            id: '·npm·@esbuild§linux-x64@0.25.11',
            location: './node_modules/.vlt/·npm·@esbuild§linux-x64@0.25.11/node_modules/@esbuild/linux-x64',
            optional: true,
            resolved: 'https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.11.tgz',
            integrity: 'sha512-Qr8AzcplUhGvdyUF08A1kHU3Vr2O88xxP0Tm8GcdVOUm25XYcMPp2YqSVHbLuXzYQMf9Bh/iKx7YPqECs6ffLA=='
          },
          Edge spec(@esbuild/win32-x64@0.25.11) -optional-> to: Node {
            id: '·npm·@esbuild§win32-x64@0.25.11',
            location: './node_modules/.vlt/·npm·@esbuild§win32-x64@0.25.11/node_modules/@esbuild/win32-x64',
            optional: true,
            resolved: 'https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.11.tgz',
            integrity: 'sha512-D7Hpz6A2L4hzsRpPaCYkQnGOotdUpDzSGRIv9I+1ITdHROSFUWW95ZPZWQmGka1Fg7W3zFJowyn9WGwMJ0+KPA=='
          }
        ]
      }
    ]
  }
]
`

exports[`test/ideal/build-ideal-from-starting-graph.ts > TAP > remove from manifest file only > must match snapshot 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(foo@^1.0.0) -prod-> to: Node {
        id: '·npm·foo@1.0.0',
        location: './node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo',
        resolved: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      }
    ]
  }
]
`
