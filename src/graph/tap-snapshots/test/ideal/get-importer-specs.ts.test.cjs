/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/get-importer-specs.ts > TAP > adding to a non existing importer > should store non-importer file deps in transientAdd 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested+folder' => Map(1) { 'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' } }
  },
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > empty graph and something to add > should result in only added specs 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file~_d' => Map(2) {
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
  'file~_d' => Map(3) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and nothing to add > should have root specs added only 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file~_d' => Map(2) {
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
  remove: RemoveImportersDependenciesMapImpl(1) [Map] {
    'file~_d' => Set(1) { 'foo' },
    modifiedDependencies: true
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to update > should have the updated root spec 1`] = `
AddImportersDependenciesMapImpl(1) [Map] {
  'file~_d' => Map(1) { 'foo' => { spec: Spec {foo@^2.0.0}, type: 'prod' } },
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and something to add > should have root and workspaces nodes with specs to add 1`] = `
AddImportersDependenciesMapImpl(3) [Map] {
  'file~_d' => Map(2) {
    'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' },
    'bar' => { spec: Spec {bar@^2.0.0}, type: 'prod' }
  },
  'workspace~packages+a' => Map(2) {
    'bar' => { spec: Spec {bar@^1.0.0}, type: 'dev' },
    'baz' => { spec: Spec {baz@^1.0.0}, type: 'prod' }
  },
  'workspace~packages+b' => Map(2) {
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
  remove: RemoveImportersDependenciesMapImpl(2) [Map] {
    'workspace~packages+a' => Set(1) { 'bar' },
    'workspace~packages+b' => Set(1) { 'a' },
    modifiedDependencies: true
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > installing over a dangling edge > should add the missing dep 1`] = `
{
  add: AddImportersDependenciesMapImpl(1) [Map] {
    'file~_d' => Map(1) { 'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' } },
    modifiedDependencies: true
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > removing from a non existing importer > should store non-importer file deps in transientRemove 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(1) { 'file~nested+folder' => Set(1) { 'baz' } }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientAdd and transientRemove combined via params > should store both transientAdd and transientRemove from params 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested+folder' => Map(1) { 'foo' => { spec: Spec {foo@^1.0.0}, type: 'prod' } }
  },
  transientRemove: Map(1) { 'file~other+folder' => Set(1) { 'bar' } }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientAdd from file-type directory manifest > should populate transientAdd from nested directory manifest 1`] = `
{
  add: AddImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested' => Map(2) {
      'bar' => { spec: Spec {bar@^2.0.0}, type: 'prod' },
      'baz' => { spec: Spec {baz@^3.0.0}, type: 'prod' }
    }
  },
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientRemove from file-type directory with removed edge > should populate transientRemove for edge not in manifest 1`] = `
{
  add: AddImportersDependenciesMapImpl(1) [Map] {
    'file~_d' => Map(1) {
      'nested' => { spec: Spec {nested@file:./nested}, type: 'prod' }
    },
    modifiedDependencies: true
  },
  remove: RemoveImportersDependenciesMapImpl(0) [Map] {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`
