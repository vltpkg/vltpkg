/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/ideal/get-importer-specs.ts > TAP > adding to a non existing importer > should store non-importer file deps in transientAdd 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested+folder' => Map(1) {
      'baz' => {
        spec: @vltpkg/spec.Spec baz@^1.0.0,
        type: 'prod'
      }
    }
  },
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > empty graph and something to add > should result in only added specs 1`] = `
AddImportersDependenciesMap {
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > empty graph with workspaces and nothing to add > should have no items to add 1`] = `
AddImportersDependenciesMap []
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and new things to add > should have root specs along with the added ones 1`] = `
AddImportersDependenciesMap {
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and nothing to add > should have root specs added only 1`] = `
AddImportersDependenciesMap {
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to remove > should removed entries missing from manifest file 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: true
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs and something to update > should have the updated root spec 1`] = `
AddImportersDependenciesMap {
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and something to add > should have root and workspaces nodes with specs to add 1`] = `
AddImportersDependenciesMap {
  modifiedDependencies: true
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > graph specs with workspaces and somethings to remove > should have root and workspaces nodes with specs to remove 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: true
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > installing over a dangling edge > should add the missing dep 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: true
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > removing from a non existing importer > should store non-importer file deps in transientRemove 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(1) {
    'file~nested+folder' => Set(1) {
      'baz'
    }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientAdd and transientRemove combined via params > should store both transientAdd and transientRemove from params 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested+folder' => Map(1) {
      'foo' => {
        spec: @vltpkg/spec.Spec foo@^1.0.0,
        type: 'prod'
      }
    }
  },
  transientRemove: Map(1) {
    'file~other+folder' => Set(1) {
      'bar'
    }
  }
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientAdd from file-type directory manifest > should populate transientAdd from nested directory manifest 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: false
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(1) {
    'file~nested' => Map(2) {
      'bar' => {
        spec: @vltpkg/spec.Spec bar@^2.0.0,
        type: 'prod'
      },
      'baz' => {
        spec: @vltpkg/spec.Spec baz@^3.0.0,
        type: 'prod'
      }
    }
  },
  transientRemove: Map(0) {}
}
`

exports[`test/ideal/get-importer-specs.ts > TAP > transientRemove from file-type directory with removed edge > should populate transientRemove for edge not in manifest 1`] = `
{
  add: AddImportersDependenciesMap {
    modifiedDependencies: true
  },
  remove: RemoveImportersDependenciesMap {
    modifiedDependencies: false
  },
  transientAdd: Map(0) {},
  transientRemove: Map(0) {}
}
`
