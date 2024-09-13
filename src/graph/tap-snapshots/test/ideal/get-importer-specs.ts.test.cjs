/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/get-importer-specs.ts > TAP > empty graph and something to add > should result in only added specs 1`] = `
Map(1) {
  'file·.' => Map(2) {
    'bar' => { spec: Spec {bar@custom:bar@^1.1.1}, type: 'dev' },
    'foo' => { spec: Spec {foo@^1.1.1}, type: 'prod' }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > empty graph with workspaces and nothing to add > should have no items to add 1`] = `
Map {}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and new things to add > should have root specs along with the added ones 1`] = `
Map(1) {
  'file·.' => Map(3) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and nothing to add > should have root specs added only 1`] = `
Map(1) {
  'file·.' => Map(2) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to remove > should removed entries missing from manifest file 1`] = `
{ add: Map(0) {}, remove: Map(1) { 'file·.' => Set(1) { 'foo' } } }
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to update > should have the updated root spec 1`] = `
Map(1) {
  'file·.' => Map(1) { 'foo' => { spec: Spec {foo@^2.0.0}, type: 'prod' } }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and something to add > should have root and workspaces nodes with specs to add 1`] = `
Map(3) {
  'file·.' => Map(2) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^2.0.0}, type: 'prod' }
  },
  'workspace·packages%2Fa' => Map(2) {
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  'workspace·packages%2Fb' => Map(2) {
    'a' => { spec: Spec {a@workspace:*}, type: 'prod' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and somethings to remove > should have root and workspaces nodes with specs to remove 1`] = `
{
  add: Map(0) {},
  remove: Map(2) {
    'workspace·packages%2Fa' => Set(1) { 'bar' },
    'workspace·packages%2Fb' => Set(1) { 'a' }
  }
}
`
