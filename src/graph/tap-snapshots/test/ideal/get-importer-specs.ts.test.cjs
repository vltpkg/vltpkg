/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/get-importer-specs.ts > TAP > empty graph and something to add > should result in only added specs 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file·.' => Map(2) {
    'bar' => { spec: Spec {bar@custom:bar@^1.1.1}, type: 'dev' },
    'foo' => { spec: Spec {foo@^1.1.1}, type: 'prod' }
  },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > empty graph with workspaces and nothing to add > should have no items to add 1`] = `
AddImportersDependenciesMapImpl {}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and new things to add > should have root specs along with the added ones 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file·.' => Map(3) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and nothing to add > should have root specs added only 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file·.' => Map(2) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' }
  },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to remove > should removed entries missing from manifest file 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  check: AddImportersDependenciesMapImpl(1) [Map] {
    'file·.' => Map(0) {},
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(1) [Map] {
    'file·.' => Set(1) { 'foo' },
    modifiedDependencies: true
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to update > should have the updated root spec 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file·.' => Map(1) { 'foo' => { spec: Spec {foo@^2.0.0}, type: 'prod' } },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and something to add > should have root and workspaces nodes with specs to add 1`] = `
AddImportersDependenciesMapImpl(3) [Map] {
  'file·.' => Map(2) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^2.0.0}, type: 'prod' }
  },
  'workspace·packages§a' => Map(2) {
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  'workspace·packages§b' => Map(2) {
    'a' => { spec: Spec {a@workspace:*}, type: 'prod' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and somethings to remove > should have root and workspaces nodes with specs to remove 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  check: AddImportersDependenciesMapImpl(3) [Map] {
    'file·.' => Map(0) {},
    'workspace·packages§a' => Map(0) {},
    'workspace·packages§b' => Map(0) {},
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(2) [Map] {
    'workspace·packages§a' => Set(1) { 'bar' },
    'workspace·packages§b' => Set(1) { 'a' },
    modifiedDependencies: true
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > installing over a dangling edge > should add the missing dep 1`] = `
{
  add: AddImportersDependenciesMapImpl(1) [Map] {
    'file·.' => Map(1) { 'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' } },
    modifiedDependencies: true
  },
  check: AddImportersDependenciesMapImpl(1) [Map] {
    'file·.' => Map(0) {},
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  }
}
`
