/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/install.ts > TAP > install > should call build -> actual.load -> reify 1`] = `
GraphModifier.maybeLoad
actual.load
buildideal result adds 0 new package(s)
reify

`

exports[`test/install.ts > TAP > install > should call build adding new dependency 1`] = `
GraphModifier.maybeLoad
actual.load
buildideal result adds 1 new package(s)
reify

`

exports[`test/install.ts > TAP > install with no package.json file in cwd > should create a graph with the new dependency 1`] = `
[
  Node {
    id: 'file·.',
    location: '.',
    importer: true,
    edgesOut: [
      Edge spec(abbrev@2.0.0) -prod-> to: Node {
        id: '··abbrev@2.0.0',
        location: './node_modules/.vlt/··abbrev@2.0.0/node_modules/abbrev',
        resolved: 'https://registry.npmjs.org/abbrev/-/abbrev-2.0.0.tgz',
        integrity: 'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ=='
      }
    ]
  }
]
`
