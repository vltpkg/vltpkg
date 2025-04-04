import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { Spec } from '@vltpkg/spec'
import type {
  DependencySaveType,
  DependencyTypeLong,
  DependencyTypeShort,
  Manifest,
} from '@vltpkg/types'
import {
  dependencyTypes,
  longDependencyTypes,
  shortDependencyTypes,
} from '@vltpkg/types'

export const isDependencyTypeShort = (
  obj: unknown,
): obj is DependencyTypeShort =>
  shortDependencyTypes.has(obj as DependencyTypeShort)

export const isDependencySaveType = (
  obj: unknown,
): obj is DependencyTypeShort =>
  shortDependencyTypes.has(obj as DependencyTypeShort) ||
  obj === 'implicit'

export const asDependencyTypeShort = (
  obj: unknown,
): DependencyTypeShort => {
  if (!isDependencyTypeShort(obj)) {
    throw error('Invalid dependency type', {
      found: obj,
      validOptions: [...shortDependencyTypes],
    })
  }
  return obj
}

/**
 * Dependency entries info as defined in a package.json file.
 */
export type RawDependency = {
  name: string
  bareSpec: string
  type: DependencyTypeLong
  registry?: string
}

/**
 * Parsed dependency entries info.
 */
export type Dependency = {
  /**
   * The parsed {@link Spec} object describing the dependency requirements.
   */
  spec: Spec
  /**
   * The {@link DependencySaveType}, describing the way this dependency should
   * be saved back to the manifest.
   */
  type: DependencySaveType
}

/**
 * A `Map` in which keys are {@link DepID} linking to another `Map` in which
 * keys are the dependency names and values are {@link Dependency}. This
 * structure represents dependencies that need to be added to the importer
 * represented by {@link DepID}.
 *
 * The `modifiedDependencies` property can be used to indicate that there
 * are added dependencies to any of the importer nodes.
 */
export type AddImportersDependenciesMap = Map<
  DepID,
  Map<string, Dependency>
> & { modifiedDependencies: boolean }

/**
 * A `Map` object representing nodes to be removed from the ideal graph.
 * Each {@link DepID} key represents an importer node and the `Set` of
 * dependency names to be removed from its dependency list.
 *
 * The `modifiedDependencies` property can be used to indicate that there
 * are added dependencies to any of the importer nodes.
 */
export type RemoveImportersDependenciesMap = Map<
  DepID,
  Set<string>
> & { modifiedDependencies: boolean }

const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

// TODO: it would be nice to have a @vltpkg/spec.isSpec method
export const isDependency = (o: unknown): o is Dependency =>
  // TODO: it would be nice to have a @vltpkg/spec.isSpec method
  isObj(o) &&
  isObj(o.spec) &&
  !!o.spec.type &&
  isDependencySaveType(o.type)

export const asDependency = (obj: unknown): Dependency => {
  if (!isDependency(obj)) {
    throw error('Invalid dependency', { found: obj })
  }
  return obj
}

/**
 * Get the {@link DependencyTypeShort} from a {@link DependencyTypeLong}.
 */
export const shorten = (
  typeLong: DependencyTypeLong,
  name?: string,
  manifest?: Manifest,
): DependencyTypeShort => {
  const shortName = dependencyTypes.get(typeLong)
  if (!shortName) {
    throw error('Invalid dependency type name', {
      found: typeLong,
      validOptions: [...longDependencyTypes],
    })
  }
  if (shortName !== 'peer') {
    return shortName
  }
  if (
    name &&
    manifest?.peerDependenciesMeta?.[name]?.optional === true
  ) {
    return 'peerOptional'
  }
  return 'peer'
}
