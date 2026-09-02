import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec/browser'
import type { SpecOptions } from '@vltpkg/spec'
import type {
  DependencySaveType,
  DependencyTypeLong,
  DependencyTypeShort,
  Manifest,
  NodeLike,
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
 *
 * Delegates to a `Map` rather than extending one: compiled, a `Map`
 * subclass inherits none of `Map`'s methods and assigning a property to a
 * `Map` instance crashes the process. The class is not generic for the
 * same reason — a generic class cannot reach its own private fields.
 */
export class AddImportersDependenciesMap implements Map<
  DepID,
  Map<string, Dependency>
> {
  #map = new Map<DepID, Map<string, Dependency>>()
  modifiedDependencies = false
  constructor(
    entries?: Iterable<readonly [DepID, Map<string, Dependency>]>,
    modifiedDependencies = false,
  ) {
    if (entries) for (const [id, deps] of entries) this.set(id, deps)
    this.modifiedDependencies = modifiedDependencies
  }
  get size() {
    return this.#map.size
  }
  get [Symbol.toStringTag]() {
    return 'Map' as const
  }
  clear() {
    this.#map.clear()
  }
  delete(id: DepID) {
    return this.#map.delete(id)
  }
  forEach(
    fn: (
      value: Map<string, Dependency>,
      key: DepID,
      map: Map<DepID, Map<string, Dependency>>,
    ) => void,
    thisArg?: unknown,
  ) {
    for (const [id, deps] of this.#map)
      fn.call(thisArg, deps, id, this)
  }
  get(id: DepID) {
    return this.#map.get(id)
  }
  has(id: DepID) {
    return this.#map.has(id)
  }
  set(id: DepID, deps: Map<string, Dependency>) {
    this.#map.set(id, deps)
    return this
  }
  entries() {
    return this.#map.entries()
  }
  keys() {
    return this.#map.keys()
  }
  values() {
    return this.#map.values()
  }
  [Symbol.iterator]() {
    return this.#map[Symbol.iterator]()
  }
  /** Snapshot of entries. Do not use `.keys`/`.entries` through a union type. */
  listPairs() {
    return [...this.#map]
  }
}

/**
 * A `Map` object representing nodes to be removed from the ideal graph.
 * Each {@link DepID} key represents an importer node and the `Set` of
 * dependency names to be removed from its dependency list.
 *
 * The `modifiedDependencies` property can be used to indicate that there
 * are added dependencies to any of the importer nodes.
 *
 * Delegates to a `Map` for the same reasons as
 * {@link AddImportersDependenciesMap}.
 */
export class RemoveImportersDependenciesMap implements Map<
  DepID,
  Set<string>
> {
  #map = new Map<DepID, Set<string>>()
  modifiedDependencies = false
  constructor(
    entries?: Iterable<readonly [DepID, Set<string>]>,
    modifiedDependencies = false,
  ) {
    if (entries)
      for (const [id, names] of entries) this.set(id, names)
    this.modifiedDependencies = modifiedDependencies
  }
  get size() {
    return this.#map.size
  }
  get [Symbol.toStringTag]() {
    return 'Map' as const
  }
  clear() {
    this.#map.clear()
  }
  delete(id: DepID) {
    return this.#map.delete(id)
  }
  forEach(
    fn: (
      value: Set<string>,
      key: DepID,
      map: Map<DepID, Set<string>>,
    ) => void,
    thisArg?: unknown,
  ) {
    for (const [id, names] of this.#map)
      fn.call(thisArg, names, id, this)
  }
  get(id: DepID) {
    return this.#map.get(id)
  }
  has(id: DepID) {
    return this.#map.has(id)
  }
  set(id: DepID, names: Set<string>) {
    this.#map.set(id, names)
    return this
  }
  entries() {
    return this.#map.entries()
  }
  keys() {
    return this.#map.keys()
  }
  values() {
    return this.#map.values()
  }
  [Symbol.iterator]() {
    return this.#map[Symbol.iterator]()
  }
  /** Snapshot of entries. Do not use `.keys`/`.entries` through a union type. */
  listPairs() {
    return [...this.#map]
  }
}

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
  manifest?: Pick<Manifest, 'peerDependenciesMeta'> | null,
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

const isStringArray = (a: unknown): a is string[] =>
  Array.isArray(a) && !a.some(b => typeof b !== 'string')

/*
 * Retrieves a map of all dependencies, of all types, that can be iterated
 * on and consulted when parsing the directory contents of a given node.
 */
export const getRawDependencies = (node: NodeLike) => {
  const dependencies = new Map<string, RawDependency>()
  const bundleDeps: unknown = node.manifest?.bundleDependencies ?? []
  // if it's an importer, bundleDeps are just normal. if it's a dep,
  // then they're ignored entirely.
  const bundled =
    (
      !node.importer &&
      !node.id.startsWith('git') &&
      isStringArray(bundleDeps)
    ) ?
      new Set(bundleDeps)
    : new Set<string>()
  for (const depType of longDependencyTypes) {
    const obj: Record<string, string> | undefined =
      node.manifest?.[depType]
    // only care about devDeps for importers and git or symlink deps
    // technically this will also include devDeps for tarball file: specs,
    // but that is likely rare enough to not worry about too much.
    if (
      depType === 'devDependencies' &&
      !node.importer &&
      !node.id.startsWith('git') &&
      !node.id.startsWith('file')
    ) {
      continue
    }
    if (obj) {
      for (const [name, bareSpec] of Object.entries(obj)) {
        // if it's a bundled dependency, we just ignore it entirely.
        if (bundled.has(name)) continue
        dependencies.set(name, {
          name,
          type: depType,
          bareSpec,
          registry: node.registry,
        })
      }
    }
  }
  return dependencies
}

/**
 * Retrieves a map of all dependencies, of all types, that can be inferred
 * from a given node manifest, including missing dependencies.
 */
export const getDependencies = (
  node: NodeLike,
  options: SpecOptions,
): Map<string, Dependency> => {
  const res = new Map<string, Dependency>()
  const dependencies = getRawDependencies(node)
  for (const { name, type, bareSpec } of dependencies.values()) {
    const depType = shorten(type, name, node.manifest)
    const spec = Spec.parse(name, bareSpec, {
      ...options,
      // fall back to options.registry so deps don't lose the configured
      // registry when the node itself has none. see vltpkg/vltpkg#1580.
      registry: node.registry ?? options.registry,
    })
    res.set(name, {
      spec,
      type: depType,
    })
  }
  return res
}
