import { Manifest, ManifestMinified } from '@vltpkg/types'

export type DependencyTypeLong =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'
export type DependencyTypeShort =
  | 'prod'
  | 'dev'
  | 'peer'
  | 'optional'
  | 'peerOptional'

export const dependencyTypes: Map<
  DependencyTypeLong,
  DependencyTypeShort
> = new Map([
  ['dependencies', 'prod'],
  ['devDependencies', 'dev'],
  ['peerDependencies', 'peer'],
  ['optionalDependencies', 'optional'],
])

export const reverseDependencyTypes: Map<
  DependencyTypeShort,
  DependencyTypeLong
> = new Map([
  ['prod', 'dependencies'],
  ['dev', 'devDependencies'],
  ['peer', 'peerDependencies'],
  ['optional', 'optionalDependencies'],
])

export class Package {
  /**
   * Where to find this package in the local file system.
   */
  location: string = ''
  /**
   * The package metadata, read from either a manifest file or package.json.
   */
  #metadata: Manifest | ManifestMinified
  /**
   * Tracks the registry a given package was initially installed from.
   */
  origin: string = ''

  constructor(
    metadata: Manifest | ManifestMinified,
    location?: string,
    origin?: string,
  ) {
    this.#metadata = metadata
    this.location = location || ''
    this.origin = origin || ''
  }

  updateMetadata(metadata: Manifest | ManifestMinified) {
    const {
      dependencies,
      devDependencies,
      optionalDependencies,
      peerDependencies,
    } = metadata
    this.#metadata.dependencies ||= dependencies
    this.#metadata.devDependencies ||= devDependencies
    this.#metadata.optionalDependencies ||= optionalDependencies
    this.#metadata.peerDependencies ||= peerDependencies
    if (metadata.dist) {
      const { integrity, shasum, tarball } = metadata.dist
      if ((integrity || shasum) && tarball && !this.#metadata.dist) {
        this.#metadata.dist = {
          integrity,
          shasum,
          tarball,
        }
      }
    }
  }

  /**
   * The name that identifies this package, defaults to location if missing.
   */
  get name(): string {
    if (this.#metadata.name) {
      return this.#metadata.name
    }
    return this.location
  }

  /**
   * The exact semver version value of this package.
   */
  get version(): string {
    return this.#metadata.version || ''
  }

  /**
   * An unique id that identifies this package.
   */
  get id(): string {
    return getId(this.origin, this.name, this.version)
  }

  get dependencies(): Record<string, string> | undefined {
    return this.#metadata.dependencies
  }

  get devDependencies() {
    return this.#metadata.devDependencies
  }

  get optionalDependencies() {
    return this.#metadata.optionalDependencies
  }

  get peerDependencies() {
    return this.#metadata.peerDependencies
  }

  get peerDependenciesMeta() {
    return this.#metadata.peerDependenciesMeta
  }

  get tarball(): string | undefined {
    return this.#metadata.dist?.tarball
  }

  get integrity(): string | undefined {
    return this.#metadata.dist?.integrity
  }

  get shasum(): string | undefined {
    return this.#metadata.dist?.shasum
  }
}

// TODO: this should be a standalone module,
// getId(spec: Spec, manifest: Manifest): string
// return value should be suitable for use as a folder name in nm/.vlt
// open question about where to put git selector/committish
function getId(
  origin: string = '',
  name: string = '',
  version: string = '',
): string {
  return `${origin}${name}@${version}`
}

export class PackageInventory extends Map<string, Package> {
  /**
   * Reference to the supported dependency types.
   */
  dependencyTypes: Map<DependencyTypeLong, DependencyTypeShort> =
    dependencyTypes
  /**
   * Pending is a list of packages that have manifest metadata already
   * registered but are pending fetching and extracting tarball contents.
   */
  pending: Set<Package> = new Set()

  /**
   * Registers a new package to the inventory.
   */
  // TODO: this should take a spec, not an origin, which is registry-specific
  // then calculate the ID from that
  registerPackage(
    metadata: Manifest | ManifestMinified,
    location?: string,
    origin?: string,
  ) {
    const id = getId(origin, metadata.name, metadata.version)
    const cachedPkg = this.get(id)
    if (cachedPkg) {
      cachedPkg.location = location || cachedPkg.location
      cachedPkg.updateMetadata(metadata)
      if (this.pending.has(cachedPkg) && cachedPkg.location) {
        this.pending.delete(cachedPkg)
      }
      return cachedPkg
    }

    const pkg = new Package(metadata, location, origin)
    this.set(pkg.id, pkg)
    return pkg
  }

  /**
   * Register a new package to the inventory and append it to the list
   * of packages pending artifacts.
   */
  registerPending(
    metadata: Manifest | ManifestMinified,
    origin?: string,
  ) {
    const pkg = this.registerPackage(metadata, undefined, origin)
    this.pending.add(pkg)
    return pkg
  }
}
