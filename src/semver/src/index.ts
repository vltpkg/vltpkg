import { Range } from './range.ts'
import { Version } from './version.ts'
import type { Comparator, OVTuple } from './comparator.ts'
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

/** Return the parsed version range, or `undefined` if invalid */
export const parseRange = (
  range: Range | string,
  includePrerelease = false,
) => {
  if (typeof range === 'object') {
    if (range.includePrerelease === includePrerelease) return range
    range = range.raw
  }
  try {
    return new Range(range, includePrerelease)
  } catch {
    return undefined
  }
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

  // Check if any set from range1 intersects with any set from range2
  return range1.set.some(set1 =>
    range2.set.some(set2 => intersectComparators(set1, set2)),
  )
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

  // Any range is only a subset of another 'any' range
  if (range2.isAny) return true
  if (range1.isAny) return false

  // Every comparator set in r1 must be a subset of at least one
  // comparator set in r2
  return range1.set.every(set1 =>
    range2.set.some(set2 => comparatorSubset(set1, set2)),
  )
}

/**
 * Check if comparator comp1 is a subset of comparator comp2.
 * Every version satisfying comp1 must also satisfy comp2.
 */
const comparatorSubset = (
  comp1: Comparator,
  comp2: Comparator,
): boolean => {
  const tuples1 = comp1.tuples.filter((t): t is OVTuple =>
    Array.isArray(t),
  )
  const tuples2 = comp2.tuples.filter((t): t is OVTuple =>
    Array.isArray(t),
  )

  // comp1 must be satisfiable
  if (!satisfiableRange(tuples1)) return true

  const bounds1 = getBounds(tuples1)
  const bounds2 = getBounds(tuples2)

  // If comp2 has an exact match, comp1 must only match that exact version
  if (bounds2.hasExact) {
    if (bounds1.hasExact) {
      return eq(bounds1.hasExact, bounds2.hasExact)
    }
    // bounds1 must collapse to exactly that version
    if (
      !bounds1.lowerBound ||
      !bounds1.upperBound ||
      !eq(bounds1.lowerBound, bounds2.hasExact) ||
      !eq(bounds1.upperBound, bounds2.hasExact) ||
      !bounds1.lowerInclusive ||
      !bounds1.upperInclusive
    ) {
      return false
    }
    return true
  }

  // If comp1 has an exact match, check it satisfies comp2's bounds
  if (bounds1.hasExact) {
    if (bounds2.lowerBound) {
      if (
        bounds2.lowerInclusive ?
          lt(bounds1.hasExact, bounds2.lowerBound)
        : lte(bounds1.hasExact, bounds2.lowerBound)
      ) {
        return false
      }
    }
    if (bounds2.upperBound) {
      if (
        bounds2.upperInclusive ?
          gt(bounds1.hasExact, bounds2.upperBound)
        : gte(bounds1.hasExact, bounds2.upperBound)
      ) {
        return false
      }
    }
    return true
  }

  // comp1's lower bound must be >= comp2's lower bound
  if (bounds2.lowerBound) {
    if (!bounds1.lowerBound) return false
    const cmp = compare(bounds1.lowerBound, bounds2.lowerBound)
    if (cmp < 0) return false
    if (
      cmp === 0 &&
      !bounds2.lowerInclusive &&
      bounds1.lowerInclusive
    )
      return false
  }

  // comp1's upper bound must be <= comp2's upper bound
  if (bounds2.upperBound) {
    if (!bounds1.upperBound) return false
    const cmp = compare(bounds1.upperBound, bounds2.upperBound)
    if (cmp > 0) return false
    if (
      cmp === 0 &&
      !bounds2.upperInclusive &&
      bounds1.upperInclusive
    )
      return false
  }

  return true
}

type Bounds = {
  lowerBound: Version | null
  lowerInclusive: boolean
  upperBound: Version | null
  upperInclusive: boolean
  hasExact: Version | null
}

const getBounds = (tuples: OVTuple[]): Bounds => {
  let lowerBound: Version | null = null
  let lowerInclusive = false
  let upperBound: Version | null = null
  let upperInclusive = false
  let hasExact: Version | null = null

  for (const [op, ver] of tuples) {
    switch (op) {
      case '':
        hasExact = ver
        break
      case '>=':
        /* c8 ignore start */
        if (
          !lowerBound ||
          gt(ver, lowerBound) ||
          (eq(ver, lowerBound) && !lowerInclusive)
        ) {
          lowerBound = ver
          lowerInclusive = true
        }
        /* c8 ignore stop */
        break
      case '>':
        if (!lowerBound || gt(ver, lowerBound)) {
          lowerBound = ver
          lowerInclusive = false
        }
        break
      case '<=':
        /* c8 ignore start */
        if (
          !upperBound ||
          lt(ver, upperBound) ||
          (eq(ver, upperBound) && !upperInclusive)
        ) {
          upperBound = ver
          upperInclusive = true
        }
        /* c8 ignore stop */
        break
      case '<':
        if (!upperBound || lt(ver, upperBound)) {
          upperBound = ver
          upperInclusive = false
        }
        break
    }
  }

  return {
    lowerBound,
    lowerInclusive,
    upperBound,
    upperInclusive,
    hasExact,
  }
}

/**
 * Check if two comparators can be satisfied simultaneously
 */
const intersectComparators = (
  comp1: Comparator,
  comp2: Comparator,
): boolean => {
  // Collect all tuples from both comparators
  const tuples1 = comp1.tuples.filter((t): t is OVTuple =>
    Array.isArray(t),
  )
  const tuples2 = comp2.tuples.filter((t): t is OVTuple =>
    Array.isArray(t),
  )

  // Check if there's a satisfiable combination
  return satisfiableRange(tuples1.concat(tuples2))
}

/**
 * Check if a set of operator-version tuples represents a satisfiable range
 * This is a simplified implementation that handles the most common cases
 */
const satisfiableRange = (tuples: OVTuple[]): boolean => {
  // Find bounds
  let lowerBound: Version | null = null
  let lowerInclusive = false
  let upperBound: Version | null = null
  let upperInclusive = false
  let hasExact: Version | null = null

  for (const [op, ver] of tuples) {
    switch (op) {
      case '':
        // Exact match - if we already have a different exact match, no intersection
        if (hasExact && !eq(hasExact, ver)) return false
        hasExact = ver
        break

      case '>=':
        /* c8 ignore start */
        if (
          !lowerBound ||
          gt(ver, lowerBound) ||
          (eq(ver, lowerBound) && !lowerInclusive)
        ) {
          lowerBound = ver
          lowerInclusive = true
        }
        /* c8 ignore stop */
        break

      case '>':
        if (!lowerBound || gt(ver, lowerBound)) {
          lowerBound = ver
          lowerInclusive = false
        }
        break

      case '<=':
        if (!upperBound || lt(ver, upperBound)) {
          upperBound = ver
          upperInclusive = true
        }
        break

      case '<':
        /* c8 ignore start */
        if (
          !upperBound ||
          lt(ver, upperBound) ||
          eq(ver, upperBound)
        ) {
          upperBound = ver
          upperInclusive = false
        }
        /* c8 ignore stop */
        break
    }
  }

  // If we have an exact match, check if it's within bounds
  if (hasExact) {
    if (lowerBound) {
      if (
        lowerInclusive ?
          lt(hasExact, lowerBound)
        : lte(hasExact, lowerBound)
      ) {
        return false
      }
    }
    if (upperBound) {
      if (
        upperInclusive ?
          gt(hasExact, upperBound)
        : gte(hasExact, upperBound)
      ) {
        return false
      }
    }
    return true
  }

  // Check if lower bound is less than or equal to upper bound
  if (lowerBound && upperBound) {
    if (gt(lowerBound, upperBound)) return false
    if (
      eq(lowerBound, upperBound) &&
      !(lowerInclusive && upperInclusive)
    )
      return false
  }

  return true
}
