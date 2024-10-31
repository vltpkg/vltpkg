import { error } from '@vltpkg/error-cause'

/** anything that can be encoded in JSON */
export type JSONField =
  | JSONField[]
  | boolean
  | number
  | string
  | { [k: string]: JSONField }
  | null

/** sha512 SRI string */
export type Integrity = `sha512-${string}`

/** SHA256 key identifier */
export type KeyID = `SHA256:${string}`

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

// Don't use Record here since TS cant do circular references with that
// https://github.com/microsoft/TypeScript/issues/41164#issuecomment-1427073368
export type ConditionalValueObject = {
  [k: string]: ConditionalValue
}

export type ConditionalValue =
  | ConditionalValue[]
  | ConditionalValueObject
  | string
  | null

export type ExportsSubpaths = {
  [path in '.' | `./${string}`]?: ConditionalValue
}

export type Exports =
  | Exclude<ConditionalValue, null>
  | ExportsSubpaths

export type Imports = Record<`#${string}`, ConditionalValue>

export type FundingEntry = string | { url: string }
export type Funding = FundingEntry | FundingEntry[]

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

export type Manifest = {
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
  bin?: Record<string, string> | string
  /** run-script actions for this package */
  scripts?: Record<string, string>
  /** supported run-time platforms this package can run on */
  engines?: Record<string, string>
  /** supported operating systems this package can run on */
  os?: string[] | string
  /** supported CPU architectures this package can run on */
  cpu?: string[] | string
  /** URLs that can be visited to fund this project */
  funding?: Funding
  /**
   * Only present in Manifests served by a registry. Contains information
   * about the artifact served for this package release.
   */
  dist?: Dist
  /** a short description of the package */
  description?: string
  /** search keywords */
  keywords?: string[]
  /** where to go to file issues */
  bugs?: Bugs
  /** where the development happens */
  repository?: Repository
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
  /** whether the package is private */
  private?: boolean
  /** whether this is ESM or CommonJS by default */
  type?: 'commonjs' | 'module'
  /** npm puts this on published manifests */
  gypfile?: boolean
}

export type ManifestRegistry = Manifest &
  Required<Pick<Manifest, 'name' | 'version' | 'dist'>>

export type Packument = {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, Manifest>
  modified?: string
  time?: Record<string, string>
  readme?: string
}

export type RefType = 'branch' | 'head' | 'other' | 'pull' | 'tag'

/**
 * A representation of a given remote ref in a {@link RevDoc} object.
 */
export type RevDocEntry = Omit<Manifest, 'type'> &
  Required<Pick<Manifest, 'version'>> & {
    /** sha this references */
    sha: string
    /** ref as passed git locally */
    ref: string
    /** canonical full ref, like `refs/tags/blahblah` */
    rawRef: string
    /** what type of ref this is: 'branch', 'tag', etc. */
    type: RefType
  }

/**
 * An object kind of resembling a packument, but about a git repo.
 */
export type RevDoc = Omit<Packument, 'versions'> & {
  /** all semver-looking tags go in this record */
  versions: Record<string, RevDocEntry>
  /** all named things that can be cloned down remotely */
  refs: Record<string, RevDocEntry>
  /** all named shas referenced above */
  shas: Record<string, string[]>
}

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

const isObj = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

const maybeRecordStringString = (
  o: unknown,
): o is Record<string, string> | undefined =>
  o === undefined || isRecordStringString(o)

const isRecordStringString = (
  o: unknown,
): o is Record<string, string> =>
  isRecordStringT<string>(o, s => typeof s === 'string')

const isRecordStringT = <T>(
  o: unknown,
  check: (o: unknown) => boolean,
): o is Record<string, T> =>
  isObj(o) &&
  Object.entries(o).every(
    ([k, v]) => typeof k === 'string' && check(v),
  )

const isRecordStringManifest = (
  o: unknown,
): o is Record<string, Manifest> =>
  isRecordStringT<Manifest>(o, v => isManifest(v))

const maybePeerDependenciesMetaSet = (
  o: unknown,
): o is Record<string, PeerDependenciesMetaValue> | undefined =>
  o === undefined ||
  isRecordStringT<PeerDependenciesMetaValue>(o, v =>
    isPeerDependenciesMetaValue(v),
  )

const maybeBoolean = (o: unknown): o is boolean =>
  o === undefined || typeof o === 'boolean'

const isPeerDependenciesMetaValue = (
  o: unknown,
): o is PeerDependenciesMetaValue =>
  isObj(o) && maybeBoolean(o.optional)

const maybeString = (a: unknown): a is string | undefined =>
  a === undefined || typeof a === 'string'

const maybeDist = (a: unknown): a is Manifest['dist'] =>
  a === undefined || (isObj(a) && maybeString(a.tarball))

export const isManifest = (m: unknown): m is Manifest =>
  isObj(m) &&
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

export const isManifestRegistry = (
  m: unknown,
): m is ManifestRegistry =>
  isManifest(m) && !!m.dist && !!m.name && !!m.version

export const asManifest = (
  m: unknown,
  from?: (...a: unknown[]) => any,
): Manifest => {
  if (!isManifest(m)) {
    throw error('invalid manifest', { found: m }, from ?? asManifest)
  }
  return m
}

export const asManifestRegistry = (
  m: unknown,
  from?: (...a: unknown[]) => any,
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
export const assertManifestRegistry: (
  m: unknown,
) => asserts m is ManifestRegistry = m => {
  asManifestRegistry(m, assertManifestRegistry)
}

export const isPackument = (p: unknown): p is Packument => {
  if (!isObj(p) || typeof p.name !== 'string') return false
  const { versions, 'dist-tags': distTags, time } = p
  return (
    isRecordStringString(distTags) &&
    isRecordStringManifest(versions) &&
    maybeRecordStringString(time) &&
    Object.values(distTags).every(v => versions[v]?.name == p.name)
  )
}

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
