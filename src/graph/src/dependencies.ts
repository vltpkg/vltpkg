import { type DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { type Spec } from '@vltpkg/spec'
import { type Manifest } from '@vltpkg/types'

/**
 * Name of the package.json keys used to define different types of dependencies.
 */
export type DependencyTypeLong =
  | 'dependencies'
  | 'devDependencies'
  | 'optionalDependencies'
  | 'peerDependencies'

/**
 * Unique keys that define different types of dependencies relationship.
 */
export type DependencyTypeShort =
  | 'dev'
  | 'optional'
  | 'peer'
  | 'peerOptional'
  | 'prod'

export const isDependencyTypeShort = (
  obj: unknown,
): obj is DependencyTypeShort =>
  shortDependencyTypes.has(obj as DependencyTypeShort)

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
   * The {@link DependencyTypeShort}, describing the type of dependency.
   */
  type: DependencyTypeShort
}

/**
 * A `Map` in which keys are {@link DepID} linking to another `Map` in which
 * keys are the dependency names and values are {@link Dependency}. This
 * structure represents dependencies that need to be added to the importer
 * represented by {@link DepID}.
 */
export type AddImportersDependenciesMap = Map<
  DepID,
  Map<string, Dependency>
>

/**
 * A `Map` object representing nodes to be removed from the ideal graph.
 * Each {@link DepID} key represents an importer node and the `Set` of
 * dependency names to be removed from its dependency list.
 */
export type RemoveImportersDependenciesMap = Map<DepID, Set<string>>

const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

// TODO: it would be nice to have a @vltpkg/spec.isSpec method
export const isDependency = (o: unknown): o is Dependency =>
  // TODO: it would be nice to have a @vltpkg/spec.isSpec method
  isObj(o) &&
  isObj(o.spec) &&
  !!o.spec.type &&
  isDependencyTypeShort(o.type)

export const asDependency = (obj: unknown): Dependency => {
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
export const shortDependencyTypes = new Set<DependencyTypeShort>([
  'prod',
  'dev',
  'peer',
  'optional',
  'peerOptional',
])

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
