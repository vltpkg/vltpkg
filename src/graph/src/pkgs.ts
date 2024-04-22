import { inspect } from 'node:util'

export type DependencyTypeLong =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies'
export type DependencyTypeShort = 'prod' | 'dev' | 'peer' | 'optional'

const dependencyTypes: Map<DependencyTypeLong, DependencyTypeShort> =
  new Map([
    ['dependencies', 'prod'],
    ['devDependencies', 'dev'],
    ['peerDependencies', 'peer'],
    ['optionalDependencies', 'optional'],
  ])

export interface PackageMetadataDist {
  tarball: string
  integrity?: string
  shasum?: string
}

export type PackageMetadata = {
  name?: string
  version?: string
  dist?: PackageMetadataDist
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

interface PackageOptions {
  location?: string
  origin?: string
}

export const isPackageMetadata = (pkg: any): pkg is PackageMetadata =>
  !!pkg && typeof pkg === 'object' && typeof pkg.name === 'string'

export class Package {
  /**
   * Where to find this package in the local file system.
   */
  location: string = ''
  /**
   * The package metadata, read from either a manifest file or package.json.
   */
  #metadata: PackageMetadata
  /**
   * Tracks the registry a given package was initially installed from.
   */
  #origin: string = ''

  constructor(metadata: PackageMetadata, options?: PackageOptions) {
    this.#metadata = metadata
    if (options?.location) {
      this.location = options?.location
    }
    this.#origin = options?.origin || ''
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
    return getId(this.#origin, this.name, this.version)
  }

  get dependencies(): Record<string, string> | undefined {
    return this.#metadata.dependencies
  }

  get devDependencies(): Record<string, string> | undefined {
    return this.#metadata.devDependencies
  }

  get optionalDependencies(): Record<string, string> | undefined {
    return this.#metadata.optionalDependencies
  }

  get peerDependencies(): Record<string, string> | undefined {
    return this.#metadata.peerDependencies
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

function getId(
  origin: string = '',
  name: string = '',
  version: string = '',
): string {
  return `${origin}${name}@${version}`
}

export class PackageInventory extends Map {
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
  registerPackage(
    metadata: PackageMetadata,
    options?: PackageOptions,
  ) {
    const id = getId(options?.origin, metadata.name, metadata.version)
    const cachedPkg = this.get(id)
    if (cachedPkg) {
      return cachedPkg
    }

    const pkg = new Package(metadata, options)
    this.set(pkg.id, pkg)
    return pkg
  }

  /**
   * Register a new package to the inventory and append it to the list
   * of packages pending artifacts.
   */
  registerPending(
    metadata: PackageMetadata,
    options?: PackageOptions,
  ) {
    const pkg = this.registerPackage(metadata, options)
    this.pending.add(pkg)
    return pkg
  }
}
