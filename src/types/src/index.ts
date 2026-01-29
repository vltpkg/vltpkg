import { error } from '@vltpkg/error-cause'
import { Version } from '@vltpkg/semver'
import type { DepID } from '@vltpkg/dep-id'
import type { Spec, SpecLikeBase, SpecOptions } from '@vltpkg/spec'

/**
 * Utility type that overrides specific properties of type T with new types
 * from R. Constrains override values to exclude undefined, ensuring that
 * normalization cannot introduce undefined to fields that shouldn't have it.
 */
export type Override<
  T,
  R extends { [K in keyof R]: R[K] extends undefined ? never : R[K] },
> = {
  [K in keyof T]: K extends keyof R ? R[K] : T[K]
}

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

/**
 * An object with url and optional additional properties
 */
export type NormalizedFundingEntry = {
  url: string
  type?: string
  [key: string]: JSONField
}

/**
 * Normalized funding information, an array of {@link NormalizedFundingEntry}.
 */
export type NormalizedFunding = NormalizedFundingEntry[]

/**
 * Normalize a single funding entry to a consistent format.
 */
const normalizeFundingEntry = (
  item: unknown,
): NormalizedFundingEntry => {
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
    // If the item is already normalized, return it directly
    if (isNormalizedFundingEntry(item)) {
      return item
    }

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

/**
 * Normalize funding information to a consistent format.
 */
export const normalizeFunding = (
  funding: unknown,
): NormalizedFunding | undefined => {
  if (!funding) return

  const fundingArray = Array.isArray(funding) ? funding : [funding]
  const sources = fundingArray.map(normalizeFundingEntry)
  return sources.length > 0 ? sources : undefined
}

/**
 * Type guard to check if a value is a {@link NormalizedFundingEntry}.
 */
export const isNormalizedFundingEntry = (
  o: unknown,
): o is NormalizedFundingEntry => {
  return (
    isObject(o) &&
    'url' in o &&
    typeof o.url === 'string' &&
    !!o.url &&
    'type' in o &&
    typeof o.type === 'string' &&
    ['github', 'patreon', 'opencollective', 'individual'].includes(
      o.type,
    )
  )
}

/**
 * Type guard to check if a value is a {@link NormalizedFunding}.
 */
export const isNormalizedFunding = (
  o: unknown,
): o is NormalizedFunding => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(isNormalizedFundingEntry)
  )
}

/**
 * Given a version Normalize the version field in a manifest.
 */
export const fixManifestVersion = <
  T extends Manifest | ManifestRegistry,
>(
  manifest: T,
): T => {
  if (!Object.hasOwn(manifest, 'version')) {
    return manifest
  }
  if (!manifest.version) {
    throw error('version is empty', {
      manifest,
    })
  }
  const version = Version.parse(manifest.version)
  manifest.version = version.toString()
  return manifest
}

const kWriteAccess = Symbol.for('writeAccess')
const kIsPublisher = Symbol.for('isPublisher')

/**
 * Parse a string or object into a normalized contributor.
 */
export const parsePerson = (
  person: unknown,
  writeAccess?: boolean,
  isPublisher?: boolean,
): NormalizedContributorEntry | undefined => {
  if (!person) return

  if (isObject(person)) {
    // this is an already parsed object person, just return its value
    if (isNormalizedContributorEntry(person)) {
      return person
    }

    const name =
      typeof person.name === 'string' ? person.name : undefined
    const email =
      typeof person.email === 'string' ? person.email
      : typeof person.mail === 'string' ? person.mail
      : undefined

    if (!name && !email) return undefined

    return {
      name,
      email,
      [kWriteAccess]: writeAccess ?? false,
      [kIsPublisher]: isPublisher ?? false,
    }
  } else if (typeof person === 'string') {
    const NAME_PATTERN = /^([^(<]+)/
    const EMAIL_PATTERN = /<([^<>]+)>/
    const name = NAME_PATTERN.exec(person)?.[0].trim() || ''
    const email = EMAIL_PATTERN.exec(person)?.[1] || ''
    if (!name && !email) return undefined
    return {
      name: name || undefined,
      email: email || undefined,
      [kWriteAccess]: writeAccess ?? false,
      [kIsPublisher]: isPublisher ?? false,
    }
  }
  return
}

/**
 * Normalized contributors - always an array of {@link NormalizedContributorEntry}.
 */
export type NormalizedContributors = NormalizedContributorEntry[]

/**
 * Represents a normalized contributor object. This is the type that is
 * used in the {@link NormalizedManifest} and {@link NormalizedManifestRegistry}
 * objects.
 */
export type NormalizedContributorEntry = {
  email?: string
  name?: string
  // in-memory we store those keys as symbols so that they
  // don't get written to user-managed package.json files
  [kWriteAccess]?: boolean
  [kIsPublisher]?: boolean
  // we also have a plain version that is used in the
  // transfer data format and lockfiles
  writeAccess?: boolean
  isPublisher?: boolean
}

/**
 * Type guard to check if a value is a normalized contributor entry.
 */
export const isNormalizedContributorEntry = (
  o: unknown,
): o is NormalizedContributorEntry => {
  return (
    isObject(o) &&
    typeof o.name === 'string' &&
    !!o.name &&
    typeof o.email === 'string' &&
    !!o.email &&
    (isBoolean((o as NormalizedContributorEntry)[kWriteAccess]) ||
      isBoolean(o.writeAccess)) &&
    (isBoolean((o as NormalizedContributorEntry)[kIsPublisher]) ||
      isBoolean(o.isPublisher))
  )
}

/**
 * Type guard to check if a value is a {@link NormalizedContributors}.
 */
export const isNormalizedContributors = (
  o: unknown,
): o is NormalizedContributors => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(isNormalizedContributorEntry)
  )
}

/**
 * Normalize contributors and maintainers from various formats
 */
export const normalizeContributors = (
  contributors: unknown,
  maintainers?: unknown,
): NormalizedContributorEntry[] | undefined => {
  if (!contributors && !maintainers) return

  const result: NormalizedContributorEntry[] = []

  // Parse regular contributors (if any)
  if (contributors) {
    const contributorsArray: unknown[] =
      Array.isArray(contributors) ? contributors : [contributors]

    const normalizedArray = contributorsArray.every(
      isNormalizedContributorEntry,
    )
    const noMaintainers =
      !maintainers ||
      (Array.isArray(maintainers) && maintainers.length === 0)

    // If all contributors are already normalized, and there are
    // no maintainers, return the contributors directly
    if (normalizedArray) {
      if (noMaintainers) {
        return contributorsArray.length > 0 ?
            contributorsArray
          : undefined
      } else {
        result.push(...contributorsArray)
      }
    }

    // Parse each contributor and filter out undefined values
    const parsedContributors = contributorsArray
      .map(person => parsePerson(person))
      .filter((c): c is NormalizedContributorEntry => c !== undefined)
    result.push(...parsedContributors)
  }

  // Parse maintainers with special flags
  if (maintainers) {
    const maintainersArray: unknown[] =
      Array.isArray(maintainers) ? maintainers : [maintainers]
    const parsedMaintainers = maintainersArray
      .map(person => parsePerson(person, true, true))
      .filter((c): c is NormalizedContributorEntry => c !== undefined)
    result.push(...parsedMaintainers)
  }

  return result.length > 0 ? result : undefined
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

export type Keywords = string[] | string

/**
 * Normalized bugs entry - always an object with type and url/email
 */
export type NormalizedBugsEntry = {
  type?: 'email' | 'link'
  url?: string
  email?: string
}

/**
 * Normalized keywords - always an array of strings
 */
export type NormalizedKeywords = string[]

/**
 * Normalized engines - always a record of string to string
 */
export type NormalizedEngines = Record<string, string>

/**
 * Normalized OS list - always an array of strings
 */
export type NormalizedOs = string[]

/**
 * Normalized CPU list - always an array of strings
 */
export type NormalizedCpu = string[]

/**
 * Normalized libc list - always an array of strings
 */
export type NormalizedLibc = string[]

/**
 * Normalized bugs - always an array of {@link NormalizedBugsEntry}
 */
export type NormalizedBugs = NormalizedBugsEntry[]

/**
 * Normalized bin - always a record of string to string
 */
export type NormalizedBin = Record<string, string>

/**
 * Helper function to normalize a single {@link Bugs} entry.
 */
const normalizeSingleBug = (bug: unknown): NormalizedBugsEntry[] => {
  const res: NormalizedBugsEntry[] = []

  if (typeof bug === 'string') {
    // Try to parse as URL first - if it succeeds, treat as link
    try {
      new URL(bug)
      res.push({ type: 'link', url: bug })
    } catch {
      // TODO: need a more robust email validation, likely
      // to be replaced with valibot / zod
      // If URL parsing fails, check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(bug)) {
        res.push({ type: 'email', email: bug })
      } else {
        // Default to link for plain strings like 'example.com'
        res.push({ type: 'link', url: bug })
      }
    }
  } else if (isObject(bug)) {
    if (isNormalizedBugsEntry(bug)) {
      res.push(bug)
    }
    const obj = bug as { url?: string; email?: string }

    if (obj.url) {
      res.push({ type: 'link', url: obj.url })
    }
    if (obj.email) {
      res.push({ type: 'email', email: obj.email })
    }
  }

  return res.length > 0 ? res : []
}

/**
 * Normalize bugs information to a {@link NormalizedBugs} consistent format.
 */
export const normalizeBugs = (
  bugs: unknown,
): NormalizedBugs | undefined => {
  if (!bugs) return

  const result: NormalizedBugsEntry[] = []

  // Handle array of bugs entries
  if (Array.isArray(bugs)) {
    for (const bug of bugs) {
      result.push(...normalizeSingleBug(bug))
    }
  } else {
    // Handle single bugs entry
    result.push(...normalizeSingleBug(bugs))
  }

  return result.length > 0 ? result : undefined
}

/**
 * Type guard to check if a value is a {@link NormalizedBugsEntry}.
 */
export const isNormalizedBugsEntry = (
  o: unknown,
): o is NormalizedBugsEntry => {
  return (
    isObject(o) &&
    'type' in o &&
    ((o.type === 'email' &&
      typeof o.email === 'string' &&
      !!o.email) ||
      (o.type === 'link' && typeof o.url === 'string' && !!o.url))
  )
}

/**
 * Type guard to check if a value is a {@link NormalizedBugs}.
 */
export const isNormalizedBugs = (o: unknown): o is NormalizedBugs => {
  return (
    Array.isArray(o) && o.length > 0 && o.every(isNormalizedBugsEntry)
  )
}

/**
 * Normalize keywords information to a {@link NormalizedKeywords} consistent format.
 */
export const normalizeKeywords = (
  keywords: unknown,
): NormalizedKeywords | undefined => {
  if (!keywords) return

  let keywordArray: string[] = []

  if (typeof keywords === 'string') {
    // Handle comma-separated string values
    keywordArray = keywords
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
  } else if (Array.isArray(keywords)) {
    // If all keywords are already normalized, return them directly
    if (isNormalizedKeywords(keywords)) {
      return keywords as unknown as NormalizedKeywords
    }
    // Handle array of strings, filter out empty/invalid entries
    keywordArray = keywords
      .filter(
        (keyword): keyword is string => typeof keyword === 'string',
      )
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
  } else {
    // Invalid format
    return
  }

  return keywordArray.length > 0 ? keywordArray : undefined
}

/**
 * Type guard to check if a value is a {@link NormalizedKeywords}.
 */
export const isNormalizedKeywords = (
  o: unknown,
): o is NormalizedKeywords => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(
      keyword =>
        typeof keyword === 'string' &&
        !!keyword &&
        !keyword.startsWith(' ') &&
        !keyword.endsWith(' '),
    )
  )
}

/**
 * Normalize engines information to a {@link NormalizedEngines} consistent format.
 */
export const normalizeEngines = (
  engines: unknown,
): NormalizedEngines | undefined => {
  if (!engines) return

  if (isNormalizedEngines(engines)) {
    // Return undefined if empty object
    return Object.keys(engines).length === 0 ? undefined : engines
  }

  // Invalid format
  return
}

/**
 * Normalize OS information to a {@link NormalizedOs} consistent format.
 */
export const normalizeOs = (
  os: unknown,
): NormalizedOs | undefined => {
  if (!os) return

  let osArray: string[] = []

  if (typeof os === 'string') {
    // Handle single OS string
    osArray = [os.trim()].filter(item => item.length > 0)
  } else if (Array.isArray(os)) {
    // If all OS entries are already normalized, return them directly
    if (isNormalizedOs(os)) {
      return os
    }
    // Handle array of strings, filter out empty/invalid entries
    osArray = os
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  } else {
    // Invalid format
    return
  }

  return osArray.length > 0 ? osArray : undefined
}

/**
 * Normalize CPU information to a {@link NormalizedCpu} consistent format.
 */
export const normalizeCpu = (
  cpu: unknown,
): NormalizedCpu | undefined => {
  if (!cpu) return

  let cpuArray: string[] = []

  if (typeof cpu === 'string') {
    // Handle single CPU string
    cpuArray = [cpu.trim()].filter(item => item.length > 0)
  } else if (Array.isArray(cpu)) {
    // If all CPU entries are already normalized, return them directly
    if (isNormalizedCpu(cpu)) {
      return cpu
    }
    // Handle array of strings, filter out empty/invalid entries
    cpuArray = cpu
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  } else {
    // Invalid format
    return
  }

  return cpuArray.length > 0 ? cpuArray : undefined
}

/**
 * Normalize libc information to a {@link NormalizedLibc} consistent format.
 */
export const normalizeLibc = (
  libc: unknown,
): NormalizedLibc | undefined => {
  if (!libc) return

  let libcArray: string[] = []

  if (typeof libc === 'string') {
    // Handle single libc string
    libcArray = [libc.trim()].filter(item => item.length > 0)
  } else if (Array.isArray(libc)) {
    // If all libc entries are already normalized, return them directly
    if (isNormalizedLibc(libc)) {
      return libc
    }
    // Handle array of strings, filter out empty/invalid entries
    libcArray = libc
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  } else {
    // Invalid format
    return
  }

  return libcArray.length > 0 ? libcArray : undefined
}

/**
 * Type guard to check if a value is a {@link NormalizedEngines}.
 */
export const isNormalizedEngines = (
  o: unknown,
): o is NormalizedEngines => {
  return isRecordStringString(o)
}

/**
 * Type guard to check if a value is a {@link NormalizedOs}.
 */
export const isNormalizedOs = (o: unknown): o is NormalizedOs => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(
      item =>
        typeof item === 'string' &&
        !!item &&
        !item.startsWith(' ') &&
        !item.endsWith(' '),
    )
  )
}

/**
 * Type guard to check if a value is a {@link NormalizedCpu}.
 */
export const isNormalizedCpu = (o: unknown): o is NormalizedCpu => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(
      item =>
        typeof item === 'string' &&
        !!item &&
        !item.startsWith(' ') &&
        !item.endsWith(' '),
    )
  )
}

/**
 * Type guard to check if a value is a {@link NormalizedLibc}.
 */
export const isNormalizedLibc = (o: unknown): o is NormalizedLibc => {
  return (
    Array.isArray(o) &&
    o.length > 0 &&
    o.every(
      item =>
        typeof item === 'string' &&
        !!item &&
        !item.startsWith(' ') &&
        !item.endsWith(' '),
    )
  )
}

/**
 * Normalizes the bin paths.
 */
export const normalizeBinPaths = (
  manifest: Pick<Manifest, 'bin' | 'name'>,
): Record<string, string> | undefined => {
  const { name, bin } = manifest

  if (bin) {
    if (name && typeof bin === 'string') {
      const [_scope, pkg] = parseScope(name)
      return { [pkg]: bin }
    } else if (typeof bin === 'object') {
      return bin
    }
  }
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
  /** supported libc implementations this package can run on (e.g. glibc, musl) */
  libc?: string[] | string
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
  keywords?: Keywords
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
  contributors?: Person[]
  /** the license of the package */
  license?: string
}

export type NormalizedFields = {
  bugs: NormalizedBugs | undefined
  author: NormalizedContributorEntry | undefined
  contributors: NormalizedContributors | undefined
  funding: NormalizedFunding | undefined
  keywords: NormalizedKeywords | undefined
  engines: NormalizedEngines | undefined
  os: NormalizedOs | undefined
  cpu: NormalizedCpu | undefined
  libc: NormalizedLibc | undefined
  bin: NormalizedBin | undefined
}

/**
 * A {@link Manifest} object that contains normalized fields.
 */
export type NormalizedManifest = Override<Manifest, NormalizedFields>

/**
 * A {@link ManifestRegistry} object that contains normalized fields.
 */
export type NormalizedManifestRegistry = Override<
  ManifestRegistry,
  NormalizedFields
>

/**
 * A specific type of {@link Manifest} that represents manifests that were
 * retrieved from a registry, these will always have `name`, `version`
 * and `dist` information along with an optional `maintainers` field.
 */
export type ManifestRegistry = Manifest &
  Required<Pick<Manifest, 'name' | 'version' | 'dist'>> & {
    maintainers?: unknown
  }

/**
 * Maps the manifest type to the equivalent normalized manifest type.
 */
export type SomeNormalizedManifest<T> =
  T extends ManifestRegistry ? NormalizedManifestRegistry
  : NormalizedManifest

/**
 * A document that represents available package versions in a given registry
 * along with extra information, such as `dist-tags` and `maintainers` info.
 * The `versions` field is key-value structure in which keys are the
 * available versions of a given package and values are
 * {@link ManifestRegistry} objects.
 */
export type Packument = {
  name: string
  'dist-tags': Record<string, string>
  versions: Record<string, Manifest>
  modified?: string
  time?: Record<string, string>
  readme?: string
  contributors?: Person[]
  maintainers?: Person[]
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

/**
 * A type guard to check if a value is a boolean.
 */
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'

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

/**
 * Is a given unknown value a valid {@link Manifest} object?
 * Returns `true` if so.
 */
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

/**
 * A specific {@link Manifest} that is retrieved uniquely from reading
 * registry packument and manifest endpoints, it has `dist`, `name` and
 * `version` fields defined.
 */
export const isManifestRegistry = (
  m: unknown,
): m is ManifestRegistry =>
  isManifest(m) && !!m.dist && !!m.name && !!m.version

/**
 * Given an unknown value, convert it to a {@link Manifest}.
 */
export const asManifest = (
  m: unknown,
  from?: (...a: unknown[]) => any,
): Manifest => {
  if (!isManifest(m)) {
    throw error('invalid manifest', { found: m }, from ?? asManifest)
  }
  return m
}

const normalizeManifestCache = new WeakMap<
  Manifest | ManifestRegistry,
  SomeNormalizedManifest<Manifest | ManifestRegistry>
>()

/**
 * Given a {@link Manifest} returns a {@link NormalizedManifest} that
 * contains normalized author, bugs, funding, contributors, keywords and
 * version fields.
 */
export const normalizeManifest = <
  T extends Manifest | ManifestRegistry,
>(
  manifest: T,
): SomeNormalizedManifest<T> => {
  // Check cache first using manifest object reference
  const cached = normalizeManifestCache.get(manifest)
  if (cached) {
    return cached as SomeNormalizedManifest<T>
  }

  manifest = fixManifestVersion(manifest)

  const normalizedAuthor = parsePerson(manifest.author)
  const normalizedFunding = normalizeFunding(manifest.funding)
  const normalizedContributors = normalizeContributors(
    manifest.contributors,
    (manifest as ManifestRegistry).maintainers,
  )
  const normalizedBugs = normalizeBugs(manifest.bugs)
  const normalizedKeywords = normalizeKeywords(manifest.keywords)
  const normalizedEngines = normalizeEngines(manifest.engines)
  const normalizedOs = normalizeOs(manifest.os)
  const normalizedCpu = normalizeCpu(manifest.cpu)
  const normalizedLibc = normalizeLibc(manifest.libc)
  const normalizedBin = normalizeBinPaths(manifest)

  // holds the same object reference but renames the variable here
  // so that it's simpler to cast it to the normalized type
  const normalizedManifest = manifest as SomeNormalizedManifest<T>

  if (normalizedAuthor) {
    normalizedManifest.author = normalizedAuthor
  } else {
    delete normalizedManifest.author
  }

  if (normalizedFunding) {
    normalizedManifest.funding = normalizedFunding
  } else {
    delete normalizedManifest.funding
  }

  if (normalizedContributors) {
    normalizedManifest.contributors = normalizedContributors
  } else {
    delete normalizedManifest.contributors
  }

  if (normalizedBugs) {
    normalizedManifest.bugs = normalizedBugs
  } else {
    delete normalizedManifest.bugs
  }

  if (normalizedKeywords) {
    normalizedManifest.keywords = normalizedKeywords
  } else {
    delete normalizedManifest.keywords
  }

  if (normalizedEngines) {
    normalizedManifest.engines = normalizedEngines
  } else {
    delete normalizedManifest.engines
  }

  if (normalizedOs) {
    normalizedManifest.os = normalizedOs
  } else {
    delete normalizedManifest.os
  }

  if (normalizedCpu) {
    normalizedManifest.cpu = normalizedCpu
  } else {
    delete normalizedManifest.cpu
  }

  if (normalizedLibc) {
    normalizedManifest.libc = normalizedLibc
  } else {
    delete normalizedManifest.libc
  }

  if (normalizedBin) {
    normalizedManifest.bin = normalizedBin
  } else {
    delete normalizedManifest.bin
  }

  // Remove maintainers field if it exists in the raw manifest
  // this can only happen if the manifest is of ManifestRegistry type
  if (
    'maintainers' in normalizedManifest &&
    normalizedManifest.maintainers
  ) {
    delete normalizedManifest.maintainers
  }

  // Cache the result using the manifest object reference
  normalizeManifestCache.set(manifest, normalizedManifest)
  return normalizedManifest
}

/**
 * Type guard to check if a value is a {@link NormalizedManifest}.
 */
export const isNormalizedManifest = (
  o: unknown,
): o is NormalizedManifest => {
  return (
    isManifest(o) &&
    // given that all these values are optional and potentially undefined
    // we only check their value content if they are present
    ('author' in o ? isNormalizedContributorEntry(o.author) : true) &&
    ('contributors' in o ?
      isNormalizedContributors(o.contributors)
    : true) &&
    ('funding' in o ? isNormalizedFunding(o.funding) : true) &&
    ('bugs' in o ? isNormalizedBugs(o.bugs) : true) &&
    ('keywords' in o ? isNormalizedKeywords(o.keywords) : true) &&
    ('engines' in o ? isNormalizedEngines(o.engines) : true) &&
    ('os' in o ? isNormalizedOs(o.os) : true) &&
    ('cpu' in o ? isNormalizedCpu(o.cpu) : true) &&
    ('libc' in o ? isNormalizedLibc(o.libc) : true)
  )
}

/**
 * Given an unknown value, convert it to a {@link NormalizedManifest}.
 */
export const asNormalizedManifest = (
  m: unknown,
  from?: (...a: unknown[]) => any,
): NormalizedManifest => {
  if (!isNormalizedManifest(m)) {
    throw error(
      'invalid normalized manifest',
      { found: m },
      from ?? asNormalizedManifest,
    )
  }
  return m
}

/**
 * Given an unknown value, convert it to a {@link ManifestRegistry}.
 */
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

/**
 * Type guard to check if a value is a {@link NormalizedManifestRegistry}.
 */
export const isNormalizedManifestRegistry = (
  o: unknown,
): o is NormalizedManifestRegistry => {
  return isNormalizedManifest(o) && isManifestRegistry(o)
}

/**
 * Given an unknown value, convert it to a {@link NormalizedManifestRegistry}.
 */
export const asNormalizedManifestRegistry = (
  m: unknown,
  from?: (...a: unknown[]) => any,
): NormalizedManifestRegistry => {
  if (!isNormalizedManifestRegistry(m)) {
    throw error(
      'invalid normalized manifest registry',
      { found: m },
      from ?? asNormalizedManifestRegistry,
    )
  }
  return m
}

/**
 * Expands a normalized contributor entry by converting the
 * in-memory symbols to their plain values.
 */
const expandNormalizedContributorEntrySymbols = (
  c: NormalizedContributorEntry,
): NormalizedContributorEntry => {
  return {
    ...c,
    writeAccess: c[kWriteAccess],
    isPublisher: c[kIsPublisher],
  }
}

/**
 * Walks a normalized manifest and expands any symbols found
 * in the `author` and `contributors` fields.
 */
export const expandNormalizedManifestSymbols = (
  m: NormalizedManifest,
): NormalizedManifest => {
  const res = { ...m }

  if (isNormalizedContributorEntry(m.author)) {
    res.author = expandNormalizedContributorEntrySymbols(m.author)
  }

  if (isNormalizedContributors(m.contributors)) {
    res.contributors = m.contributors.map(
      expandNormalizedContributorEntrySymbols,
    )
  }

  return res
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
  'optional',
  'peer',
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

// Abstract graph types for loose coupling with graph implementations
export type EdgeLike = {
  name: string
  from: NodeLike
  spec: SpecLikeBase
  to?: NodeLike
  type: DependencyTypeShort
  optional?: boolean
  peer?: boolean
}

export type GraphLike = {
  importers: Set<NodeLike>
  mainImporter: NodeLike
  projectRoot: string
  nodes: Map<DepID, NodeLike>
  nodesByName: Map<string, Set<NodeLike>>
  edges: Set<EdgeLike>
  addEdge: (
    type: DependencyTypeShort,
    spec: Spec,
    from: NodeLike,
    to?: NodeLike,
  ) => EdgeLike
  addNode: (
    id?: DepID,
    manifest?: NormalizedManifest,
    spec?: Spec,
    name?: string,
    version?: string,
  ) => NodeLike
  removeNode(
    node: NodeLike,
    replacement?: NodeLike,
    keepEdges?: boolean,
  ): void
}

export type NodeLike = {
  id: DepID
  confused: boolean
  edgesIn: Set<EdgeLike>
  edgesOut: Map<string, EdgeLike>
  workspaces: Map<string, EdgeLike> | undefined
  location?: string
  manifest?: NormalizedManifest | null
  rawManifest?: NormalizedManifest | null
  name?: string | null
  version?: string | null
  integrity?: string | null
  resolved?: string | null
  importer: boolean
  graph: GraphLike
  mainImporter: boolean
  projectRoot: string
  dev: boolean
  optional: boolean
  modifier?: string | undefined
  peerSetHash?: string | undefined
  registry?: string
  platform?: {
    engines?: Record<string, string>
    os?: string[] | string
    cpu?: string[] | string
    libc?: string[] | string
  }
  bins?: Record<string, string>
  buildState?: 'none' | 'needed' | 'built' | 'failed'
  buildAllowed?: boolean
  buildBlocked?: boolean
  options: SpecOptions
  toJSON: () => Pick<
    NodeLike,
    | 'id'
    | 'name'
    | 'version'
    | 'location'
    | 'importer'
    | 'manifest'
    | 'projectRoot'
    | 'integrity'
    | 'resolved'
    | 'dev'
    | 'optional'
    | 'confused'
    | 'platform'
    | 'buildState'
    | 'buildAllowed'
    | 'buildBlocked'
  > & {
    rawManifest?: NodeLike['manifest']
  }
  toString(): string
  setResolved(): void
  setConfusedManifest(
    fixed: NormalizedManifest,
    confused?: NormalizedManifest,
  ): void
  maybeSetConfusedManifest(
    spec: Spec,
    confused?: NormalizedManifest,
  ): void
}

/**
 * Parse a scoped package name into its scope and name components.
 */
export const parseScope = (
  scoped: string,
): [string | undefined, string] => {
  if (scoped.startsWith('@')) {
    const [scope, name, ...rest] = scoped.split('/')
    if (scope && name && rest.length === 0) return [scope, name]
  }
  return [undefined, scoped]
}
