/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > no semver dep > should use provided def in package json save 1`] = `
Array [
  Object {
    "dependencies": Object {
      "foo": "1.0.0",
      "git": "github:a/b",
    },
    "devDependencies": Object {
      "def": "^1.0.0",
      "range": "~1.1.0",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`

exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > non-registry dependency type > should have appended dependencies object as expected 1`] = `
Array [
  Object {
    "dependencies": Object {
      "foo": "1.0.0",
      "git": "github:a/b",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`

exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > registry gt range dep > should use provided range in package json save 1`] = `
Array [
  Object {
    "dependencies": Object {
      "git": "github:a/b",
    },
    "devDependencies": Object {
      "def": "^1.0.0",
      "gtor": ">=1.1.0 || 2",
      "range": "~1.1.0",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`

exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > registry range dep > should use provided range in package json save 1`] = `
Array [
  Object {
    "dependencies": Object {
      "foo": "1.0.0",
      "git": "github:a/b",
    },
    "devDependencies": Object {
      "range": "~1.1.0",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`

exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > remove dependencies > should have remove dependency 1`] = `
Array [
  Object {
    "dependencies": Object {
      "git": "github:a/b",
    },
    "devDependencies": Object {
      "def": "^1.0.0",
      "range": "~1.1.0",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`

exports[`test/reify/update-importers-package-json.ts > TAP > updatePackageJson > should have appended dependencies object as expected 1`] = `
Array [
  Object {
    "dependencies": Object {
      "foo": "1.0.0",
    },
    "name": "root",
    "version": "1.0.0",
  },
]
`
