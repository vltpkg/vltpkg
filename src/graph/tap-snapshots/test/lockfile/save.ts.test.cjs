/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/lockfile/save.ts > TAP > save > must match snapshot 1`] = `
{
  "registries": {
    "npm": "https://registry.npmjs.org",
    "custom": "http://example.com"
  },
  "nodes": {
    "file;.": [null],
    "registry;;bar@1.0.0": [null],
    "registry;;foo@1.0.0": ["sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="],
    "registry;custom;baz@1.0.0": [null,"http://example.com/baz.tgz"]
  },
  "edges": [
    ["file;.","prod","foo@^1.0.0","registry;;foo@1.0.0"],
    ["registry;;foo@1.0.0","prod","bar@^1.0.0","registry;;bar@1.0.0"],
    ["file;.","prod","baz@custom:baz@^1.0.0","registry;custom;baz@1.0.0"]
  ]
}
`
