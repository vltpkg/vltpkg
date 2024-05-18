import { error } from '@vltpkg/error-cause'

/** anything that can be encoded in JSON */
export type JSONField =
  | string
  | number
  | null
  | JSONField[]
  | { [k: string]: JSONField }

/** sha512 SRI string */
export type Integrity = `sha512-${string}`

const integrityRE = /^sha512-[a-zA-Z0-9/+]{86}==$/
export const isIntegrity = (i: unknown): i is Integrity =>
  typeof i === 'string' && integrityRE.test(i)

export const asIntegrity = (i: unknown): Integrity => {
  if (!isIntegrity(i)) {
    throw error(
      'invalid integrity',
      {
        found: i,
        wanted: integrityRE,
      },
      asIntegrity,
    )
  }
  return i
}

export const assertIntegrity: (
  i: unknown,
) => asserts i is Integrity = i => {
  asIntegrity(i)
}

/** SHA256 key identifier */
export type KeyID = `SHA256:${string}`

const keyIDRE = /^SHA256:[a-zA-Z0-9/+]{43}$/
export const isKeyID = (k: unknown): k is KeyID =>
  typeof k === 'string' && keyIDRE.test(k)

export const asKeyID = (k: unknown): KeyID => {
  if (!isKeyID(k)) {
    throw error(
      'invalid key ID',
      {
        found: k,
        wanted: keyIDRE,
      },
      asKeyID,
    )
  }
  return k
}

export const assertKeyID: (k: unknown) => asserts k is KeyID = k => {
  asKeyID(k)
}

/** The Manifest['dist'] field present in registry manifests */
export type Dist = {
  integrity?: Integrity
  shasum?: string
  tarball?: string
  fileCount?: number
  unpackedSize?: number
  signatures?: {
    keyid: KeyID
    sig: string
  }[]
}

/** An object used to mark some peerDeps as optional */
export type PeerDependenciesMetaValue = {
  optional?: boolean
}

export type ConditionalValueObject = {
  [k: string]: ConditionalValue
}
export type ConditionalValue =
  | null
  | string
  | ConditionalValueObject
  | ConditionalValue[]

export type ExportsSubpaths = {
  [path: string]: ConditionalValue
}

export type Exports =
  | Exclude<ConditionalValue, null>
  | ExportsSubpaths

export type Imports = {
  [path: `#${string}`]: ConditionalValue
}

export type Funding =
  | string
  | { url: string }
  | string[]
  | { url: string }[]

const maybeRecordStringString = (
  o: unknown,
): o is undefined | Record<string, string> =>
  o === undefined || isRecordStringString(o)

const isRecordStringString = (
  o: unknown,
): o is Record<string, string> =>
  isRecordStringT<string>(o, s => typeof s === 'string')

const isRecordStringT = <T>(
  o: unknown,
  check: (o: unknown) => boolean,
): o is Record<string, T> =>
  !!o &&
  typeof o === 'object' &&
  Object.entries(o).every(
    ([k, v]) => typeof k === 'string' && check(v),
  )

const isRecordStringManifest = (
  o: unknown,
): o is Record<string, Manifest> =>
  isRecordStringT<Manifest>(o, v => isManifest(v))

const maybePeerDependenciesMetaSet = (
  o: unknown,
): o is undefined | Record<string, PeerDependenciesMetaValue> =>
  o === undefined ||
  isRecordStringT<PeerDependenciesMetaValue>(o, v =>
    isPeerDependenciesMetaValue(v),
  )

const maybeBoolean = (o: unknown): o is boolean =>
  o === undefined || typeof o === 'boolean'

const isPeerDependenciesMetaValue = (
  o: any,
): o is PeerDependenciesMetaValue =>
  !!o && typeof o === 'object' && maybeBoolean(o.optional)

const maybeString = (a: unknown): a is undefined | string =>
  a === undefined || typeof a === 'string'

const maybeDist = (a: any): a is Manifest['dist'] =>
  a === undefined ||
  (!!a && typeof a === 'object' && maybeString(a.tarball))

export const isManifest = (m: any): m is Manifest =>
  !!m &&
  typeof m === 'object' &&
  !Array.isArray(m) &&
  maybeString(m.name) &&
  maybeString(m.version) &&
  maybeRecordStringString(m.dependencies) &&
  maybeRecordStringString(m.devDependencies) &&
  maybeRecordStringString(m.optionalDependencies) &&
  maybeRecordStringString(m.peerDependencies) &&
  maybeRecordStringString(m.acceptDependencies) &&
  maybePeerDependenciesMetaSet(m.peerDependenciesMeta) &&
  maybeDist(m.dist)

export type ManifestRegistry = Manifest & {
  name: string
  version: string
  dist: Dist
}

export const isManifestRegistry = (
  m: unknown,
): m is ManifestRegistry =>
  isManifest(m) && !!m.dist && !!m.name && !!m.version

export type ManifestMinified = {
  /** The name of the package. optional because {} is a valid package.json */
  name?: string
  /** The version of the package. optional because {} is a valid package.json */
  version?: string
  /** production dependencies, name:specifier */
  dependencies?: Record<string, string>
  /** development dependencies, name:specifier */
  devDependencies?: Record<string, string>
  /** optional dependencies, name:specifier */
  optionalDependencies?: Record<string, string>
  /** peer dependencies, name:specifier */
  peerDependencies?: Record<string, string>
  /** peer dependencies marked as optional */
  peerDependenciesMeta?: Record<string, PeerDependenciesMetaValue>
  /** dependency ranges that are acceptable, but not forced */
  acceptDependencies?: Record<string, string>
  /** names of dependencies included in the package tarball */
  bundleDependencies?: string[]
  /** a message indicating that this is not to be used */
  deprecated?: string
  /** executable built and linked by this package */
  bin?: string | Record<string, string>
  /** run-script actions for this package */
  scripts?: Record<string, string>
  /** supported run-time platforms this package can run on */
  engines?: Record<string, string>
  /** supported operating systems this package can run on */
  os?: string | string[]
  /** supported CPU architectures this package can run on */
  cpu?: string | string[]
  /** URLs that can be visited to fund this project */
  funding?: Funding
  /**
   * Only present in Manifests served by a registry. Contains information
   * about the artifact served for this package release.
   */
  dist?: Dist
}

export type Person =
  | string
  | {
      name: string
      url?: string
      email?: string
    }

export type Repository =
  | string
  | {
      type: string
      url: string
    }

export type Bugs =
  | string
  | {
      url?: string
      email?: string
    }

export type Manifest = Record<string, JSONField> &
  ManifestMinified & {
    /** a short description of the package */
    description?: string
    /** search keywords */
    keywords?: string[]
    /** where to go to file issues */
    bugs?: Bugs
    /** where the development happens */
    repository?: Repository
    /** whether this is ESM or CommonJS by default */
    type?: 'module' | 'commonjs'
    /** the main module, if exports['.'] is not set */
    main?: string
    /** named subpath exports */
    exports?: Exports
    /** named #identifier imports */
    imports?: Imports
    /**
     * the HEAD of the git repo this was published from
     * only present in published packages
     */
    gitHead?: string
  }

export type PackumentBase = {
  name: string
  'dist-tags': Record<string, string>
}
export type PackumentMinified = PackumentBase & {
  versions: Record<string, ManifestMinified>
  modified?: string
}

export type Packument = Record<string, JSONField> &
  PackumentBase & {
    versions: Record<string, Manifest>
    time?: Record<string, string>
    readme?: string
  }

export const asManifest = (
  m: unknown,
  from?: (...a: any[]) => any,
): Manifest => {
  if (!isManifest(m)) {
    throw error('invalid manifest', { found: m }, from ?? asManifest)
  }
  return m
}

export const asManifestMinified = (
  m: unknown,
  from?: (...a: any[]) => any,
): ManifestMinified => asManifest(m, from ?? asManifestMinified)

export const asManifestRegistry = (
  m: unknown,
  from?: (...a: any[]) => any,
): ManifestRegistry => {
  if (!isManifestRegistry(m)) {
    throw error(
      'invalid registry manifest',
      { found: m },
      from ?? asManifestRegistry,
    )
  }
  return m
}

export const assertManifest: (
  m: unknown,
) => asserts m is Manifest = m => {
  asManifest(m, assertManifest)
}
export const assertManifestMinified: (
  m: unknown,
) => asserts m is Manifest = m => {
  asManifestMinified(m, assertManifestMinified)
}
export const assertManifestRegistry: (
  m: unknown,
) => asserts m is ManifestRegistry = m => {
  asManifestRegistry(m, assertManifestRegistry)
}

export const isPackument = (p: any): p is Packument =>
  !!p &&
  typeof p === 'object' &&
  typeof p.name === 'string' &&
  isRecordStringString(p['dist-tags']) &&
  isRecordStringManifest(p.versions) &&
  maybeRecordStringString(p.time) &&
  Object.values(p['dist-tags']).every(
    v => !!p.versions[v] && p.versions[v].name == p.name,
  )

export const isPackumentMinified = (
  p: unknown,
): p is PackumentMinified => isPackument(p)
export const asPackumentMinified = (p: unknown): PackumentMinified =>
  asPackument(p, asPackumentMinified)

export const asPackument = (
  p: unknown,
  from?: (...a: unknown[]) => any,
): Packument => {
  if (!isPackument(p)) {
    throw error(
      'invalid packument',
      { found: p },
      from ?? asPackument,
    )
  }
  return p
}

export const assertPackument: (
  m: unknown,
) => asserts m is Packument = m => {
  asPackument(m)
}
export const assertPackumentMinified: (
  m: unknown,
) => asserts m is PackumentMinified = m => {
  asPackumentMinified(m)
}
