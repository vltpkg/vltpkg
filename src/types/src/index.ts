import { error } from '@vltpkg/error-cause'

/** anything that can be encoded in JSON */
export type JSONField =
  | JSONField[]
  | boolean
  | number
  | string
  | { [k: string]: JSONField }
  | null
  | undefined

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

export type FundingEntry =
  | string
  | { url: string; type?: string; [key: string]: JSONField }
export type Funding = FundingEntry | FundingEntry[]

/** Normalized funding entry - always an object with url and optional additional properties */
export type NormalizedFundingEntry = {
  url: string
  type?: string
  [key: string]: JSONField
}
/** Normalized funding - always an array of objects */
export type NormalizedFunding = NormalizedFundingEntry[]

/** Normalize funding information to a consistent format. */
export const normalizeFunding = (
  funding: unknown,
): NormalizedFunding | undefined => {
  if (funding === undefined || funding === null) {
    return undefined
  }

  const normalizeItem = (item: unknown): NormalizedFundingEntry => {
    const getTypeFromUrl = (url: string): string => {
      try {
        const { hostname } = new URL(url)
        const domain =
          hostname.startsWith('www.') ? hostname.slice(4) : hostname
        if (domain === 'github.com') return 'github'
        if (domain === 'patreon.com') return 'patreon'
        if (domain === 'opencollective.com') return 'opencollective'
        return 'individual'
      } catch {
        return 'invalid'
      }
    }

    const validateType = (
      url: string,
      type?: string,
    ): string | undefined => {
      const urlType = getTypeFromUrl(url)
      if (
        !type ||
        ['github', 'patreon', 'opencollective'].includes(urlType)
      )
        return urlType
      if (urlType === 'invalid') return undefined
      return type
    }

    if (typeof item === 'string') {
      return { url: item, type: getTypeFromUrl(item) }
    }
    if (
      isObject(item) &&
      'url' in item &&
      typeof item.url === 'string'
    ) {
      const obj = item
      const url = obj.url as string
      const validatedType = validateType(
        url,
        obj.type as string | undefined,
      )
      const result = { ...obj, url } as Record<string, unknown>
      if (validatedType) {
        result.type = validatedType
      } else {
        delete result.type
      }
      return result as NormalizedFundingEntry
    }
    return { url: '', type: 'individual' }
  }

  const fundingArray = Array.isArray(funding) ? funding : [funding]
  const sources = fundingArray.map(normalizeItem)
  return sources
}

/* Parse a string or object into a normalized contributor */
export const parsePerson = (
  author: unknown,
  writeAccess?: boolean,
  isPublisher?: boolean,
): NormalizedContributor | undefined => {
  if (typeof author === 'string') {
    const NAME_PATTERN = /^([^(<]+)/
    const EMAIL_PATTERN = /<([^<>]+)>/
    const name = NAME_PATTERN.exec(author)?.[0].trim() || ''
    const email = EMAIL_PATTERN.exec(author)?.[1] || ''
    if (!name && !email) return undefined
    return {
      name: name || undefined,
      email: email || undefined,
      writeAccess: writeAccess ?? false,
      isPublisher: isPublisher ?? false,
    }
  } else if (isObject(author)) {
    const name =
      typeof author.name === 'string' ? author.name : undefined
    const email =
      typeof author.email === 'string' ? author.email
      : typeof author.mail === 'string' ? author.mail
      : undefined

    if (!name && !email) return undefined

    return {
      name,
      email,
      writeAccess: writeAccess ?? false,
      isPublisher: isPublisher ?? false,
    }
  }
  return undefined
}

/**
 * Represents a normalized contributor object.
 */
export type NormalizedContributor = {
  email?: string
  name?: string
  writeAccess?: boolean
  isPublisher?: boolean
}

/**
 * Normalize contributors and maintainers from various formats
 */
export const normalizeContributors = (
  contributors: unknown,
  maintainers?: unknown,
): NormalizedContributor[] | undefined => {
  if (!contributors && !maintainers) {
    return undefined
  }

  const result: NormalizedContributor[] = []

  // Parse regular contributors (if any)
  if (contributors) {
    const contributorsArray: unknown[] =
      Array.isArray(contributors) ? contributors : [contributors]
    const parsedContributors = contributorsArray
      .map(person => parsePerson(person))
      .filter((c): c is NormalizedContributor => c !== undefined)
    result.push(...parsedContributors)
  }

  // Parse maintainers with special flags
  if (maintainers) {
    const maintainersArray: unknown[] =
      Array.isArray(maintainers) ? maintainers : [maintainers]
    const parsedMaintainers = maintainersArray
      .map(person => parsePerson(person, true, true))
      .filter((c): c is NormalizedContributor => c !== undefined)
    result.push(...parsedMaintainers)
  }

  return result
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
  /** The homepage of the repository */
  homepage?: string
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
  /** the author of a package */
  author?: Person
  /** contributors to the package */
  contributors?: NormalizedContributor[]
  /** the license of the package */
  license?: string
}

export type ManifestRegistry = Manifest &
  Required<Pick<Manifest, 'name' | 'version' | 'dist'>> & {
    maintainers?: unknown
  }

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

export const integrityRE = /^sha512-[a-zA-Z0-9/+]{86}==$/
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

export const keyIDRE = /^SHA256:[a-zA-Z0-9/+]{43}$/
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

/**
 * Convert an unknown value to an error.
 */
export const asError = (
  er: unknown,
  fallbackMessage = 'Unknown error',
): Error =>
  er instanceof Error ? er : new Error(String(er) || fallbackMessage)

/**
 * Check if a value is an error.
 */
export const isError = (er: unknown): er is Error =>
  er instanceof Error

/**
 * Check if an error has a cause property.
 */
export const isErrorWithCause = (
  er: unknown,
): er is Error & { cause: unknown } => isError(er) && 'cause' in er

/**
 * Check if an unknown value is a plain object.
 */
export const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === 'object' &&
  (v.constructor === Object ||
    (v.constructor as unknown) === undefined)

export const maybeRecordStringString = (
  o: unknown,
): o is Record<string, string> | undefined =>
  o === undefined || isRecordStringString(o)

export const isRecordStringString = (
  o: unknown,
): o is Record<string, string> =>
  isRecordStringT<string>(o, s => typeof s === 'string')

export const assertRecordStringString: (o: unknown) => void = (
  o: unknown,
): asserts o is Record<string, string> =>
  assertRecordStringT<string>(
    o,
    s => typeof s === 'string',
    'Record<string, string>',
  )

export const isRecordStringT = <T>(
  o: unknown,
  check: (o: unknown) => o is T,
): o is Record<string, T> =>
  isObject(o) &&
  Object.entries(o).every(
    ([k, v]) => typeof k === 'string' && check(v),
  )

export const assertRecordStringT: <T>(
  o: unknown,
  check: (o: unknown) => o is T,
  wanted: string,
) => asserts o is Record<string, T> = <T>(
  o: unknown,
  check: (o: unknown) => o is T,
  /** a type description, like 'Record<string, Record<string, string>>' */
  wanted: string,
): asserts o is Record<string, T> => {
  if (!isRecordStringT(o, check)) {
    throw error('Invalid record', {
      found: o,
      wanted,
    })
  }
}

export const isRecordStringManifest = (
  o: unknown,
): o is Record<string, Manifest> =>
  isRecordStringT<Manifest>(o, v => isManifest(v))

export const maybePeerDependenciesMetaSet = (
  o: unknown,
): o is Record<string, PeerDependenciesMetaValue> | undefined =>
  o === undefined ||
  isRecordStringT<PeerDependenciesMetaValue>(o, v =>
    isPeerDependenciesMetaValue(v),
  )

export const maybeBoolean = (o: unknown): o is boolean =>
  o === undefined || typeof o === 'boolean'

export const isPeerDependenciesMetaValue = (
  o: unknown,
): o is PeerDependenciesMetaValue =>
  isObject(o) && maybeBoolean(o.optional)

export const maybeString = (a: unknown): a is string | undefined =>
  a === undefined || typeof a === 'string'

export const maybeDist = (a: unknown): a is Manifest['dist'] =>
  a === undefined || (isObject(a) && maybeString(a.tarball))

export const isManifest = (m: unknown): m is Manifest =>
  isObject(m) &&
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
  return normalizeManifest(m)
}

/**
 * Returns a {@link Manifest} with normalized data.
 */
export const normalizeManifest = (
  manifest: Manifest | ManifestRegistry,
): Manifest => {
  // checks for properties with specific normalization helper methods,
  // if there's nothing to normalize then we just return the original manifest
  if (
    manifest.funding === undefined &&
    manifest.contributors === undefined &&
    !('maintainers' in manifest)
  ) {
    return manifest
  }

  const normalizedFunding = normalizeFunding(manifest.funding)
  const normalizedContributors = normalizeContributors(
    manifest.contributors,
    (manifest as ManifestRegistry).maintainers,
  )

  // Create result with normalized data
  const result: Manifest = {
    ...manifest,
    funding: normalizedFunding as Funding,
    contributors: normalizedContributors,
  }

  // Remove maintainers field if it exists in the raw manifest
  if ('maintainers' in manifest && manifest.maintainers) {
    // Return a new manifest without the maintainers field
    const resultWithoutMaintainers: Record<string, unknown> =
      structuredClone(result)
    delete resultWithoutMaintainers.maintainers
    return resultWithoutMaintainers as Manifest
  }

  return result
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
  return normalizeManifest(m) as ManifestRegistry
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
  if (!isObject(p) || typeof p.name !== 'string') return false
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

/**
 * Unique keys that indicate how a new or updated dependency should be saved
 * back to a manifest.
 *
 * `'implicit'` is used to indicate that a dependency should be saved as
 * whatever type it already exists as. If the dependency does not exist,
 * then `'implicit'` is equivalent to `'prod'`, as that is the default
 * save type.
 */
export type DependencySaveType = DependencyTypeShort | 'implicit'

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
