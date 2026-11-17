import { Range } from './range.ts'
import { Version } from './version.ts'
import type { IncrementType } from './version.ts'
import { syntaxError } from '@vltpkg/error-cause'

export * from './comparator.ts'
export * from './range.ts'
export * from './version.ts'

/** Return the parsed version string, or `undefined` if invalid */
export const parse = (version: Version | string) => {
  if (!(typeof version === 'string')) return version
  try {
    return Version.parse(version)
  } catch {
    return undefined
  }
}

/**
 * Bounded cache for {@link parseRange}, keyed on `(includePrerelease, raw)`.
 * `Range` is effectively immutable after construction, so parsed results
 * (including `undefined` for invalid input, tracked via `has()`) are safe
 * to share across callers. Cleared wholesale once it hits the cap rather
 * than tracking LRU order, since real workloads only see a few hundred to
 * a few thousand distinct range strings per install.
 *
 * Sharing instances also means textually identical ranges are identical
 * objects, which is what makes the identity-keyed `intersectsCache` below
 * effective.
 */
const rangeCache = new Map<string, Range | undefined>()
const MAX_RANGE_CACHE = 4096

/** Return the parsed version range, or `undefined` if invalid */
export const parseRange = (
  range: Range | string,
  includePrerelease = false,
) => {
  if (typeof range === 'object') {
    if (range.includePrerelease === includePrerelease) return range
    range = range.raw
  }
  const key = `${+includePrerelease}\0${range}`
  // single map lookup on the common hit path; the extra has() check only
  // runs for ranges cached as invalid (undefined) and for misses
  const cached = rangeCache.get(key)
  if (cached !== undefined || rangeCache.has(key)) return cached
  let parsed: Range | undefined
  try {
    parsed = new Range(range, includePrerelease)
  } catch {
    parsed = undefined
  }
  if (rangeCache.size >= MAX_RANGE_CACHE) rangeCache.clear()
  rangeCache.set(key, parsed)
  return parsed
}

/**
 * return true if the version is valid
 *
 * Note: do not use this if you intend to immediately parse the version if it's
 * valid. Just use {@link parse}, and guard the possible undefined value, or
 * use `Version.parse(..)` to throw on invalid values.
 */
export const valid = (version: Version | string) => !!parse(version)

/**
 * return true if the range is valid
 *
 * Note: do not use this if you intend to immediately parse the range if it's
 * valid. Just use {@link parseRange}, and guard the possible undefined value,
 * or use `new Range(..)` to throw on invalid values.
 */
export const validRange = (range: Range | string) =>
  !!parseRange(range)

/**
 * Return true if the version satisfies the range.
 */
export const satisfies = (
  version: Version | string,
  range: Range | string,
  includePrerelease = false,
) => {
  if (typeof version === 'string') {
    const parsed = parse(version)
    if (!parsed) return false
    version = parsed
  }
  if (typeof range === 'string') {
    const parsed = parseRange(range, includePrerelease)
    if (!parsed) return false
    range = parsed
  }
  return version.satisfies(range)
}

/**
 * Increment the specified part of the version, and return the resulting
 * object. If a Version object is provided, it will be modified in-place.
 *
 * See {@link Version.inc} for full description.
 */
export const inc = (
  version: Version | string,
  part: IncrementType,
  prereleaseIdentifier?: string,
) =>
  (typeof version === 'string' ?
    Version.parse(version)
  : version
  ).inc(part, prereleaseIdentifier)

/**
 * The method used by {@link sort}, exported for passing directly to
 * `Array.sort`.
 *
 * Usage:
 *
 * ```ts
 * import { sortMethod } from '@vltpkg/semver'
 * const versions = ['1.2.3', '5.2.3', '2.3.4']
 * console.log(versions.sort(sortMethod))
 * // ['1.2.3', '2.3.4', '5.2.3']
 * ```
 */
export const sortMethod = (
  a: Version | string,
  b: Version | string,
) => {
  const pa = parse(a)
  const pb = parse(b)
  /* c8 ignore start - nondeterministic */
  if (!pa && !pb) return String(a).localeCompare(String(b), 'en')
  if (!pa) return 1
  if (!pb) return -1
  /* c8 ignore stop */
  return pa.compare(pb)
}

/**
 * Sort an array of version strings or objects in ascending SemVer precedence
 * order (ie, lowest versions first).
 *
 * Invalid version strings are sorted to the end of the array in ascending
 * alphabetical order.
 *
 * Note: when using this method, the list is cloned prior to sorting, to
 * prevent surprising mutation. To sort the list in place, see
 * {@link sortMethod}.
 */
export const sort = <T extends Version | string = Version | string>(
  list: T[],
): T[] => list.slice().sort(sortMethod)

/**
 * Sort an array of version strings or objects in descending SemVer
 * precedence order (ie, highest versions first).
 *
 * Invalid version strings are sorted to the end of the array in ascending
 * alphabetical order.
 *
 * Note: when using this method, the list is cloned prior to sorting, to
 * prevent surprising mutation. To sort the list in place, see
 * {@link rsortMethod}.
 */
export const rsort = <T extends Version | string = Version | string>(
  list: T[],
): T[] => list.slice().sort(rsortMethod)

/**
 * The method used by {@link rsort}, exported for passing directly to
 * `Array.sort`.
 *
 * Usage:
 *
 * ```ts
 * import { rsortMethod } from '@vltpkg/semver'
 * const versions = ['1.2.3', '5.2.3', '2.3.4']
 * console.log(versions.sort(rsortMethod))
 * // ['5.2.3', '2.3.4', '1.2.3']
 * ```
 */
export const rsortMethod = (
  a: Version | string,
  b: Version | string,
) => {
  const pa = parse(a)
  const pb = parse(b)
  /* c8 ignore start - nondeterministic */
  if (!pa && !pb) return String(a).localeCompare(String(b), 'en')
  if (!pa) return 1
  if (!pb) return -1
  /* c8 ignore stop */
  return pa.rcompare(pb)
}

/**
 * Method used by {@link filter}, for use in `Array.filter` directly.
 *
 * Usage:
 *
 * ```ts
 * import { filterMethod } from '@vltpkg/semver'
 * const versions = ['1.2.3', '5.2.3', '2.3.4']
 * console.log(versions.filter(filterMethod('>=2.x')))
 * // ['5.2.3', '2.3.4']
 * ```
 */
export const filterMethod = (
  range: Range | string,
  includePrerelease = false,
): ((version: Version | string) => boolean) => {
  const r = parseRange(range, includePrerelease)
  return !r ?
      () => false
    : version => satisfies(version, r, r.includePrerelease)
}

/**
 * Filter a list of versions to find all that match a given range.
 */
export const filter = <T extends Version | string = Version | string>(
  list: T[],
  range: Range | string,
  includePrerelease = false,
): T[] => list.filter(filterMethod(range, includePrerelease))

/**
 * Find the highest-precedence match for a range within a list of versions
 *
 * Returns `undefined` if no match was found.
 */
export const highest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined => {
  const r = parseRange(range, includePrerelease)
  if (!r) return undefined
  let max: Version | undefined = undefined
  for (const v of list) {
    const version = parse(v)
    if (!version) continue
    if (!version.satisfies(r)) continue
    if (!max) max = version
    else if (version.greaterThan(max)) max = version
  }
  return max
}

/**
 * Faster form of {@link highest}, for use when the list is sorted
 * in precedence order (lower-precedence versions first).
 *
 * Note: This stops at the first match, and will produce incorrect results
 * when the list is not properly sorted!
 */
export const sortedHighest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined => {
  const r = parseRange(range, includePrerelease)
  if (!r) return undefined
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i]
    /* c8 ignore next */
    if (!v) continue
    const version = parse(v)
    if (!version) continue
    if (!version.satisfies(r)) continue
    return version
  }
}

/**
 * Faster form of {@link highest}, for use when the list is sorted
 * in reverse precedence order (higher-precedence versions first).
 *
 * Note: This stops at the first match, and will produce incorrect results
 * when the list is not properly sorted!
 */
export const rsortedHighest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined => {
  const r = parseRange(range, includePrerelease)
  if (!r) return undefined
  for (const v of list) {
    const version = parse(v)
    if (!version) continue
    if (!version.satisfies(r)) continue
    return version
  }
}

/**
 * Find the lowest-precedence match for a range within a list of versions
 *
 * Returns `undefined` if no match was found.
 */
export const lowest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined => {
  const r = parseRange(range, includePrerelease)
  if (!r) return undefined
  let min: Version | undefined = undefined
  for (const v of list) {
    const version = parse(v)
    if (!version) continue
    if (!version.satisfies(r)) continue
    if (!min) min = version
    else if (version.lessThan(min)) min = version
  }
  return min
}

/**
 * Faster form of {@link lowest}, for use when the list is sorted
 * in precedence order (lower-precedence versions first).
 *
 * Note: This stops at the first match, and will produce incorrect results
 * when the list is not properly sorted!
 */
export const sortedLowest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined =>
  rsortedHighest(list, range, includePrerelease)

/**
 * Faster form of {@link lowest}, for use when the list is sorted
 * in reverse precedence order (higher-precedence versions first).
 *
 * Note: This stops at the first match, and will produce incorrect results
 * when the list is not properly sorted!
 */
export const rsortedLowest = (
  list: (Version | string)[],
  range: Range | string,
  includePrerelease = false,
): Version | undefined =>
  sortedHighest(list, range, includePrerelease)

/**
 * Same as {@link sortMethod}, but throws if either version is not valid.
 * 1 if versionA is higher precedence than versionB
 * -1 if versionA is lower precedence than versionB
 * 0 if they have equal precedence
 */
export const compare = (
  versionA: Version | string,
  versionB: Version | string,
) => {
  const a = parse(versionA)
  if (!a) {
    throw syntaxError('invalid version', { found: versionA })
  }
  const b = parse(versionB)
  if (!b) {
    throw syntaxError('invalid version', { found: versionB })
  }
  return a.compare(b)
}

/**
 * Inverse of {@link compare}
 *
 * Same as {@link rsortMethod}, but throws if either version is not valid.
 *
 * -1 if versionA is higher precedence than versionB
 * 1 if versionA is lower precedence than versionB
 * 0 if they have equal precedence
 */
export const rcompare = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionB, versionA)

/** true if versionA is > versionB. throws on invalid values */
export const gt = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) > 0
/** true if versionA is >= versionB. throws on invalid values */
export const gte = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) >= 0
/** true if versionA is < versionB. throws on invalid values */
export const lt = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) < 0
/** true if versionA is &lt;= versionB. throws on invalid values */
export const lte = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) <= 0
/** true if versionA is not equal to versionB. throws on invalid values */
export const neq = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) !== 0
/** true if versionA is equal to versionB. throws on invalid values */
export const eq = (
  versionA: Version | string,
  versionB: Version | string,
) => compare(versionA, versionB) === 0

/** extract the major version number, or undefined if invalid */
export const major = (version: Version | string) =>
  parse(version)?.major
/** extract the minor version number, or undefined if invalid */
export const minor = (version: Version | string) =>
  parse(version)?.minor
/** extract the patch version number, or undefined if invalid */
export const patch = (version: Version | string) =>
  parse(version)?.patch
/**
 * extract the list of prerelease identifiers, or undefined if the version
 * is invalid. If no prerelease identifiers are present, returns `[]`.
 */
export const prerelease = (version: Version | string) => {
  const p = parse(version)
  if (!p) return undefined
  return p.prerelease ?? []
}
/**
 * extract the list of build identifiers, or undefined if the version
 * is invalid. If no build identifiers are present, returns `[]`.
 */
export const build = (version: Version | string) => {
  const p = parse(version)
  if (!p) return undefined
  return p.build ?? []
}

/** return all versions that do not have any prerelease identifiers */
export const stable = <T extends Version | string = Version | string>(
  versions: T[],
): T[] =>
  versions.filter(v => {
    const p = parse(v)
    if (!p) return false
    return !p.prerelease?.length
  })

/**
 * Identity-keyed cache for {@link intersects}. Keying on the `Range`
 * instances themselves (rather than a string of their raw sources) keeps
 * the hit path free of string building, and needs no size cap or clear
 * policy: entries are dropped by GC together with their ranges. It relies
 * on `rangeCache` deduping instances, so string inputs and `spec.range`
 * objects for the same source share entries; callers constructing a fresh
 * `Range` per call simply recompute, as they did before memoization.
 */
const intersectsCache = new WeakMap<Range, WeakMap<Range, boolean>>()

/**
 * Return true if the range r1 intersects any of the ranges r2
 * r1 and r2 are either Range objects or range strings.
 * Returns true if any version would satisfy both ranges.
 */
export const intersects = (
  r1: Range | string,
  r2: Range | string,
  includePrerelease?: boolean,
) => {
  const range1 =
    typeof r1 === 'string' ? parseRange(r1, includePrerelease) : r1
  const range2 =
    typeof r2 === 'string' ? parseRange(r2, includePrerelease) : r2

  if (!range1 || !range2) return false

  // If either range is 'any', they intersect
  if (range1.isAny || range2.isAny) return true

  let inner = intersectsCache.get(range1)
  const cached = inner?.get(range2)
  if (cached !== undefined) return cached

  // some version must satisfy both ranges
  const result = critical(range1, range2).some(
    v => range1.test(v) && range2.test(v),
  )
  if (!inner) {
    inner = new WeakMap()
    intersectsCache.set(range1, inner)
  }
  inner.set(range2, result)
  return result
}

/**
 * Check if range r1 is a subset of range r2.
 * Returns true if every version that satisfies r1 also satisfies r2.
 */
export const subset = (
  r1: Range | string,
  r2: Range | string,
  includePrerelease?: boolean,
): boolean => {
  const range1 =
    typeof r1 === 'string' ? parseRange(r1, includePrerelease) : r1
  const range2 =
    typeof r2 === 'string' ? parseRange(r2, includePrerelease) : r2

  if (!range1 || !range2) return false

  // no version may satisfy r1 without also satisfying r2
  return !critical(range1, range2).some(
    v => range1.test(v) && !range2.test(v),
  )
}

/**
 * The versions that decide whether two ranges overlap. A range matches a
 * union of intervals that begin and end at its own bounds, so a non-empty
 * overlap or difference always contains one of the versions next to a bound.
 */
const critical = (...ranges: Range[]): Version[] => {
  const v = (M: number, m: number, p: number, pr?: string) =>
    new Version('', M, m, p, pr, undefined)
  const out = [v(0, 0, 0, '0'), v(0, 0, 0)]
  for (const range of ranges) {
    for (const comp of range.set) {
      for (const t of comp.tuples) {
        if (!Array.isArray(t)) continue
        const { major: M, minor: m, patch: p, prerelease: pr } = t[1]
        out.push(
          t[1],
          v(M, m, p), // the release of this bound
          v(M, m, p, '0'), // lowest prerelease of its tuple
          v(M, m, p + 1), // next release
          v(M, m, p + 1, '0'), // first version after a release
        )
        // first version after a prerelease
        if (pr?.length) out.push(v(M, m, p, [...pr, 0].join('.')))
      }
    }
  }
  return out
}
