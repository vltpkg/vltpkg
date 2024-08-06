import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import { ManifestMinified } from '@vltpkg/types'

/**
 * Name of the package.json keys used to define different types of dependencies.
 */
export type DependencyTypeLong =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'

/**
 * Unique keys that define different types of dependencies relationship.
 */
export type DependencyTypeShort =
  | 'prod'
  | 'dev'
  | 'peer'
  | 'optional'
  | 'peerOptional'

/**
 * Dependency entries info as defined in a package.json file.
 */
export interface RawDependency {
  name: string
  bareSpec: string
  type: DependencyTypeLong
  registry?: string
}

/**
 * Parsed dependency entries info.
 */
export interface Dependency {
  /**
   * The parsed {@link Spec} object describing the dependency requirements.
   */
  spec: Spec
  /**
   * The {@link DependencyTypeShort}, describing the type of dependency.
   */
  type: DependencyTypeShort
}

export const isDependency = (obj: any): obj is Dependency =>
  // TODO: it would be nice to have a @vltpkg/spec.isSpec method
  obj?.spec?.type &&
  obj?.type &&
  shortDependencyTypes.has(obj?.type)

export const asDependency = (obj: any): Dependency => {
  if (!isDependency(obj)) {
    throw error('Invalid dependency', { found: obj })
  }
  return obj
}

/**
 * A set of the possible long dependency type names,
 * as used in `package.json` files.
 */
export const longDependencyTypes = new Set<DependencyTypeLong>([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
])

/**
 * A set of the short type keys used to represent dependency relationships.
 */
export const shortDependencyTypes = new Set<DependencyTypeShort>(
  ['prod', 'dev', 'peer', 'optional', 'peerOptional'],
)

/**
 * Maps between long form names usually used in `package.json` files
 * to a corresponding short form name, used in lockfiles.
 */
export const dependencyTypes = new Map<
  DependencyTypeLong,
  DependencyTypeShort
>([
  ['dependencies', 'prod'],
  ['devDependencies', 'dev'],
  ['peerDependencies', 'peer'],
  ['optionalDependencies', 'optional'],
])

/**
 * Get the {@link DependencyTypeShort} from a {@link DependencyTypeLong}.
 */
export const shorten = (
  typeLong: DependencyTypeLong,
  name?: string,
  manifest?: ManifestMinified,
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
