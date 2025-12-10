/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/load-nodes.ts > TAP > load nodes > should load node missing name and version 1`] = `
Object {
  "buildState": "none",
  "confused": false,
  "dev": false,
  "id": "·npm·lorem",
  "importer": false,
  "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
  "location": "./node_modules/.vlt/·npm·lorem/node_modules/·npm·lorem",
  "manifest": undefined,
  "modifier": undefined,
  "name": "·npm·lorem",
  "optional": false,
  "platform": undefined,
  "projectRoot": "{ROOT}",
  "resolved": undefined,
  "version": undefined,
}
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes > should load nodes into graph 1`] = `
Array [
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "location": ".",
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "name": "my-project",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": undefined,
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "file·linked",
    "importer": false,
    "integrity": undefined,
    "location": "linked",
    "manifest": undefined,
    "modifier": undefined,
    "name": "linked",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "linked",
    "version": undefined,
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "·npm·foo@1.0.0",
    "importer": false,
    "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    "location": "./node_modules/.vlt/·npm·foo@1.0.0/node_modules/foo",
    "manifest": undefined,
    "modifier": undefined,
    "name": "foo",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "·npm·edge-case@",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.vlt/·npm·edge-case@/node_modules/edge-case",
    "manifest": undefined,
    "modifier": undefined,
    "name": "edge-case",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": undefined,
    "version": undefined,
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "·npm·bar@1.0.0",
    "importer": false,
    "integrity": "sha512-6/deadbeef==",
    "location": "./node_modules/.vlt/·npm·bar@1.0.0/node_modules/bar",
    "manifest": undefined,
    "modifier": undefined,
    "name": "bar",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.example.com/bar/-/bar-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "·npm·baz@1.0.0",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.pnpm/baz@1.0.0/node_modules/baz",
    "manifest": undefined,
    "modifier": undefined,
    "name": "baz",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/baz/-/baz-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "remote·http%3A§§example.com§tarball.tgz",
    "importer": false,
    "integrity": "sha512-deadbeefcafebabe==",
    "location": "./node_modules/.vlt/remote·http%3A§§example.com§tarball.tgz/node_modules/remote-pkg",
    "manifest": undefined,
    "modifier": undefined,
    "name": "remote-pkg",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "http://example.com/tarball.tgz",
    "version": undefined,
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with buildState > should load nodes with correct buildState values 1`] = `
Array [
  Object {
    "buildState": "built",
    "id": "·npm·already-built@1.0.0",
    "name": "already-built",
  },
  Object {
    "buildState": "failed",
    "id": "·npm·failed-build@1.0.0",
    "name": "failed-build",
  },
  Object {
    "buildState": "needed",
    "id": "·npm·needs-build@1.0.0",
    "name": "needs-build",
  },
  Object {
    "buildState": "none",
    "id": "·npm·no-build@1.0.0",
    "name": "no-build",
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with confused manifest > should load node with confused manifest 1`] = `
Object {
  "buildState": "none",
  "confused": true,
  "dev": false,
  "id": "·npm·foo@1.0.0",
  "importer": false,
  "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
  "location": "node_modules/.pnpm/foo@1.0.0/node_modules/foo",
  "manifest": Object {
    "name": "foo",
    "version": "1.0.0",
  },
  "modifier": undefined,
  "name": "foo",
  "optional": false,
  "platform": undefined,
  "projectRoot": "{ROOT}",
  "rawManifest": Object {
    "name": "test",
    "version": "1.0.0",
  },
  "resolved": "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz",
  "version": "1.0.0",
}
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with hydration from actual graph > should hydrate nodes with data from actual graph 1`] = `
Array [
  Object {
    "dev": false,
    "hasManifest": true,
    "id": "·npm·bar@1.5.0",
    "integrity": "sha512-actualBarIntegrity==",
    "manifestKeys": Array [
      "description",
      "name",
      "version",
    ],
    "name": "bar",
    "optional": true,
    "resolved": "https://registry.npmjs.org/bar/-/bar-1.5.0.tgz",
    "version": "1.5.0",
  },
  Object {
    "dev": true,
    "hasManifest": true,
    "id": "·npm·baz@3.0.0",
    "integrity": "sha512-lockfileBazIntegrity==",
    "manifestKeys": Array [
      "name",
      "scripts",
      "version",
    ],
    "name": "baz",
    "optional": false,
    "resolved": "https://registry.npmjs.org/baz/-/baz-3.0.0.tgz",
    "version": "3.0.0",
  },
  Object {
    "dev": false,
    "hasManifest": true,
    "id": "·npm·foo@2.0.0",
    "integrity": "sha512-actualFooIntegrity==",
    "manifestKeys": Array [
      "dependencies",
      "name",
      "version",
    ],
    "name": "foo",
    "optional": false,
    "resolved": "https://registry.npmjs.org/foo/-/foo-2.0.0.tgz",
    "version": "2.0.0",
  },
  Object {
    "dev": false,
    "hasManifest": true,
    "id": "·npm·missing@1.0.0",
    "integrity": "sha512-missingIntegrity==",
    "manifestKeys": Array [
      "name",
      "version",
    ],
    "name": "missing",
    "optional": false,
    "resolved": "https://registry.npmjs.org/missing/-/missing-1.0.0.tgz",
    "version": "1.0.0",
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with manifest > should load nodes into graph with manifest data 1`] = `
Array [
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "location": ".",
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "name": "my-project",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": undefined,
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": true,
    "id": "·npm·bar@1.0.0",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.vlt/·npm·bar@1.0.0/node_modules/bar",
    "manifest": Object {
      "name": "bar",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "name": "bar",
    "optional": true,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/bar/-/bar-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": true,
    "id": "·npm·foo@1.0.0",
    "importer": false,
    "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    "location": "node_modules/.pnpm/foo@1.0.0/node_modules/foo",
    "manifest": Object {
      "dist": Object {
        "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      },
      "name": "foo",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "name": "foo",
    "optional": false,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "buildState": "none",
    "confused": false,
    "dev": false,
    "id": "·custom·baz@1.0.0",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.vlt/·custom·baz@1.0.0/node_modules/baz",
    "manifest": Object {
      "dist": Object {
        "tarball": "http://example.com/baz.tgz",
      },
      "name": "baz",
      "version": "1.0.0",
    },
    "modifier": undefined,
    "name": "baz",
    "optional": true,
    "platform": undefined,
    "projectRoot": "{ROOT}",
    "resolved": "http://example.com/baz.tgz",
    "version": "1.0.0",
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with modifier and peerSetHash from extra DepID parameter > should load nodes with correct modifiers and peerSetHash from extra DepID parameters 1`] = `
Array [
  Object {
    "id": "file·.§local-pkg·%3Aroot%20%3E%20%23file-pkg%E1%B9%97%3Adef456",
    "modifier": ":root > #file-pkg",
    "name": "file-pkg",
    "peerSetHash": "ṗ:def456",
  },
  Object {
    "id": "git·https%3A§§github.com§user§repo.git·main·%E1%B9%97%3Aabc123",
    "modifier": undefined,
    "name": "git-pkg",
    "peerSetHash": "ṗ:abc123",
  },
  Object {
    "id": "·npm·modified-pkg@1.0.0·%3Aroot%20%3E%20%23modified-pkg",
    "modifier": ":root > #modified-pkg",
    "name": "modified-pkg",
    "peerSetHash": undefined,
  },
  Object {
    "id": "·npm·regular-pkg@1.0.0",
    "modifier": undefined,
    "name": "regular-pkg",
    "peerSetHash": undefined,
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with no actual graph provided > should load nodes without hydration from actual graph 1`] = `
Array [
  Object {
    "dev": false,
    "hasManifest": false,
    "id": "·npm·standalone@1.0.0",
    "integrity": undefined,
    "name": "standalone",
    "optional": false,
    "resolved": "https://registry.npmjs.org/standalone/-/standalone-1.0.0.tgz",
    "version": "1.0.0",
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with platform and bin > should load nodes with platform and bin data 1`] = `
Array [
  Object {
    "bins": Object {
      "alt-name": "./bin/alt.js",
      "pkg-with-bin": "./bin/cli.js",
    },
    "id": "·npm·pkg-with-bin@1.0.0",
    "name": "pkg-with-bin",
    "platform": Object {
      "cpu": Array [
        "x64",
        "arm64",
      ],
      "engines": Object {
        "node": ">=18.0.0",
      },
      "os": Array [
        "linux",
        "darwin",
      ],
    },
  },
  Object {
    "bins": Object {
      "platform-pkg": "./index.js",
    },
    "id": "·npm·platform-pkg@2.0.0",
    "name": "platform-pkg",
    "platform": Object {
      "cpu": "x64",
      "engines": Object {
        "node": ">=20.0.0",
        "npm": ">=10.0.0",
      },
      "os": "win32",
    },
  },
]
`
