/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/load-nodes.ts > TAP > load nodes > should load node missing name and version 1`] = `
Object {
  "dev": false,
  "id": "··lorem",
  "importer": false,
  "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
  "location": "./node_modules/.vlt/··lorem/node_modules/··lorem",
  "manifest": undefined,
  "name": "··lorem",
  "optional": false,
  "projectRoot": "{ROOT}",
  "resolved": undefined,
  "version": undefined,
}
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes > should load nodes into graph 1`] = `
Array [
  Object {
    "dev": false,
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "location": ".",
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "name": "my-project",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": undefined,
    "version": "1.0.0",
  },
  Object {
    "dev": false,
    "id": "file·linked",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.vlt/file·linked/node_modules/linked",
    "manifest": undefined,
    "name": "linked",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": "linked",
    "version": undefined,
  },
  Object {
    "dev": false,
    "id": "··foo@1.0.0",
    "importer": false,
    "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
    "location": "./node_modules/.vlt/··foo@1.0.0/node_modules/foo",
    "manifest": undefined,
    "name": "foo",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "dev": false,
    "id": "··bar@1.0.0",
    "importer": false,
    "integrity": "sha512-6/deadbeef==",
    "location": "./node_modules/.vlt/··bar@1.0.0/node_modules/bar",
    "manifest": undefined,
    "name": "bar",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.example.com/bar/-/bar-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "dev": false,
    "id": "··baz@1.0.0",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.pnpm/baz@1.0.0/node_modules/baz",
    "manifest": undefined,
    "name": "baz",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/baz/-/baz-1.0.0.tgz",
    "version": "1.0.0",
  },
]
`

exports[`test/lockfile/load-nodes.ts > TAP > load nodes with manifest > should load nodes into graph with manifest data 1`] = `
Array [
  Object {
    "dev": false,
    "id": "file·.",
    "importer": true,
    "integrity": undefined,
    "location": ".",
    "manifest": Object {
      "name": "my-project",
      "version": "1.0.0",
    },
    "name": "my-project",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": undefined,
    "version": "1.0.0",
  },
  Object {
    "dev": true,
    "id": "··bar@1.0.0",
    "importer": false,
    "integrity": undefined,
    "location": "./node_modules/.vlt/··bar@1.0.0/node_modules/bar",
    "manifest": Object {
      "name": "bar",
      "version": "1.0.0",
    },
    "name": "bar",
    "optional": true,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/bar/-/bar-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
    "dev": true,
    "id": "··foo@1.0.0",
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
    "name": "foo",
    "optional": false,
    "projectRoot": "{ROOT}",
    "resolved": "https://registry.npmjs.org/foo/-/foo-1.0.0.tgz",
    "version": "1.0.0",
  },
  Object {
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
    "name": "baz",
    "optional": true,
    "projectRoot": "{ROOT}",
    "resolved": "http://example.com/baz.tgz",
    "version": "1.0.0",
  },
]
`
