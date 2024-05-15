/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/save.ts > TAP > save > must match snapshot 1`] = `
{
  "registries": {
    "npm:": "https://registry.npmjs.org"
  },
  "store": {
    "my-project@1.0.0": "",
    "foo@1.0.0": "sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=="
  },
  "tree": [
    "; ; my-project@1.0.0",
    "foo@^1.0.0; prod; foo@1.0.0"
  ],
  "treeId": "AQA="
}
`

exports[`test/save.ts > TAP > save to store using shasum > must match snapshot 1`] = `
{
  "registries": {
    "npm:": "https://registry.npmjs.org"
  },
  "store": {
    "my-project@1.0.0": "",
    "foo@1.0.0": "; cf59829b8b4f03f89dda2771cb7f3653828c89bf"
  },
  "tree": [
    "; ; my-project@1.0.0",
    "foo@^1.0.0; prod; foo@1.0.0"
  ],
  "treeId": "AQA="
}
`
