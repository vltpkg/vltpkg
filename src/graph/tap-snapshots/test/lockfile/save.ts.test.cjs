/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/save.ts > TAP > missing registries > must match snapshot 1`] = `
{
  "registries": {},
  "nodes": {
    "file;.": ["my-project"]
  },
  "edges": []
}

`

exports[`test/lockfile/save.ts > TAP > save > must match snapshot 1`] = `
{
  "registries": {
    "npm": "https://registry.npmjs.org",
    "custom": "http://example.com"
  },
  "nodes": {
    "file;.": ["my-project"],
    ";;bar@1.0.0": ["bar"],
    ";;foo@1.0.0": ["foo","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",null,"node_modules/.pnpm/foo@1.0.0/node_modules/foo"],
    ";custom;baz@1.0.0": ["baz",null,"http://example.com/baz.tgz"]
  },
  "edges": [
    ["file;.","prod","foo@^1.0.0",";;foo@1.0.0"],
    ["file;.","prod","baz@custom:baz@^1.0.0",";custom;baz@1.0.0"],
    [";;foo@1.0.0","prod","bar@^1.0.0",";;bar@1.0.0"]
  ]
}

`

exports[`test/lockfile/save.ts > TAP > save > save manifests > must match snapshot 1`] = `
{
  "registries": {
    "npm": "https://registry.npmjs.org",
    "custom": "http://example.com"
  },
  "nodes": {
    "file;.": [
      "my-project",
      null,
      null,
      null,
      {
        "name": "my-project",
        "version": "1.0.0",
        "dependencies": {
          "baz": "custom:^1.0.0",
          "foo": "^1.0.0"
        }
      }
    ],
    ";;bar@1.0.0": [
      "bar",
      null,
      null,
      null,
      {
        "name": "bar",
        "version": "1.0.0"
      }
    ],
    ";;foo@1.0.0": [
      "foo",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      "node_modules/.pnpm/foo@1.0.0/node_modules/foo",
      {
        "name": "foo",
        "version": "1.0.0",
        "dist": {
          "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
        }
      }
    ],
    ";custom;baz@1.0.0": [
      "baz",
      null,
      "http://example.com/baz.tgz",
      null,
      {
        "name": "baz",
        "version": "1.0.0",
        "dist": {
          "tarball": "http://example.com/baz.tgz"
        }
      }
    ]
  },
  "edges": [
    [
      "file;.",
      "prod",
      "foo@^1.0.0",
      ";;foo@1.0.0"
    ],
    [
      "file;.",
      "prod",
      "baz@custom:baz@^1.0.0",
      ";custom;baz@1.0.0"
    ],
    [
      ";;foo@1.0.0",
      "prod",
      "bar@^1.0.0",
      ";;bar@1.0.0"
    ]
  ]
}
`

exports[`test/lockfile/save.ts > TAP > workspaces > save manifests > must match snapshot 1`] = `
{
  "registries": {
    "npm": "https://registry.npmjs.org",
    "custom": "http://example.com"
  },
  "nodes": {
    "file;.": [
      "my-project",
      null,
      null,
      null,
      {
        "name": "my-project",
        "version": "1.0.0"
      }
    ],
    "workspace;packages%2Fa": [
      "a",
      null,
      null,
      null,
      {
        "name": "a",
        "version": "1.0.0"
      }
    ],
    "workspace;packages%2Fb": [
      "b",
      null,
      null,
      null,
      {
        "name": "b",
        "version": "1.0.0",
        "dependencies": {
          "c": "^1.0.0"
        }
      }
    ],
    ";;c@1.0.0": [
      "c",
      "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==",
      null,
      null,
      {
        "name": "c",
        "version": "1.0.0",
        "dist": {
          "integrity": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
        }
      }
    ]
  },
  "edges": [
    [
      "workspace;packages%2Fb",
      "prod",
      "c@^1.0.0",
      ";;c@1.0.0"
    ]
  ]
}
`

exports[`test/lockfile/save.ts > TAP > workspaces > should save lockfile with workspaces nodes 1`] = `
{
  "registries": {
    "npm": "https://registry.npmjs.org",
    "custom": "http://example.com"
  },
  "nodes": {
    "file;.": ["my-project"],
    "workspace;packages%2Fa": ["a"],
    "workspace;packages%2Fb": ["b"],
    ";;c@1.0.0": ["c","sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="]
  },
  "edges": [
    ["workspace;packages%2Fb","prod","c@^1.0.0",";;c@1.0.0"]
  ]
}

`
