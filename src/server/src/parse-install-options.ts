import { asDepID } from '@vltpkg/dep-id'
import type {
  AddImportersDependenciesMap,
  Dependency,
  InstallOptions,
} from '@vltpkg/graph'
import { asDependency } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import type { GUIInstallOptions } from './handle-request.ts'

class AddImportersDependenciesMapImpl
  extends Map
  implements AddImportersDependenciesMap
{
  modifiedDependencies = false
}

export const parseInstallOptions = (
  options: InstallOptions & SpecOptions,
  args: GUIInstallOptions,
): [InstallOptions, AddImportersDependenciesMap] => {
  const addArgs = new AddImportersDependenciesMapImpl()
  for (const [importerId, deps] of Object.entries(args)) {
    const depMap = new Map<string, Dependency>()
    for (const [name, { version, type }] of Object.entries(deps)) {
      depMap.set(
        name,
        asDependency({
          spec: Spec.parse(name, version, options),
          type,
        }),
      )
      addArgs.modifiedDependencies = true
    }
    addArgs.set(asDepID(importerId), depMap)
  }
  return [options, addArgs]
}
