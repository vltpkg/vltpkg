/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/remove-satisfied-specs.ts > TAP > empty graph and add parameters > should return an empty map 1`] = `
Map {}
`

exports[`test/ideal/remove-satisfied-specs.ts > TAP > graph with an actual node > add a new spec item > should return the new item 1`] = `
Map(1) {
  'file·.' => Map(1) { 'bar' => { spec: Spec {bar@^1.0.0}, type: 'prod' } }
}
`

exports[`test/ideal/remove-satisfied-specs.ts > TAP > graph with an actual node > add spec is satisfied > should return an empty map 1`] = `
Map {}
`

exports[`test/ideal/remove-satisfied-specs.ts > TAP > graph with an actual node > registry tag > should not return registry tag item if something already satisfies it 1`] = `
Map(0) {}
`

exports[`test/ideal/remove-satisfied-specs.ts > TAP > graph with an actual node > update existing spec > should return the update item 1`] = `
Map(1) {
  'file·.' => Map(1) { 'foo' => { spec: Spec {foo@^2.0.0}, type: 'prod' } }
}
`
