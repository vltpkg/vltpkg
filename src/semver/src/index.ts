import { Range } from './range.js'
import { IncrementType, Version } from './version.js'

export * from './comparator.js'
export * from './range.js'
export * from './version.js'

/** Return the parsed version string, or `undefined` if invalid */
export const parse = (version: string | Version) => {
  if (version instanceof Version) return version
  try {
    return Version.parse(String(version))
  } catch {
    return undefined
  }
}

/** Return the parsed version range, or `undefined` if invalid */
export const parseRange = (
  range: string | Range,
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
export const valid = (version: string | Version) => !!parse(version)

/**
 * return true if the range is valid
 *
 * Note: do not use this if you intend to immediately parse the range if it's
 * valid. Just use {@link parseRange}, and guard the possible undefined value,
 * or use `new Range(..)` to throw on invalid values.
 */
export const validRange = (range: string | Range) =>
  !!parseRange(range)

/**
 * Return true if the version satisfies the range.
 */
export const satisfies = (
  version: string | Version,
  range: string | Range,
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
 * Part behaviors:
 *
 * - `'major'` If the version is a `M.0.0-...` version with a prerelease, then
 * simply drop the prerelease. Otherwise, set the minor and patch to 0, and
 * increment the major. So `1.0.0-beta` becomes `1.0.0`, and `1.2.3` becomes
 * `2.0.0`
 *
 * - `'minor'` If the version is a `M.m.0-...` version with a prerelease, then
 * simply drop the prerelease. Otherwise, set the patch to 0, and increment the
 * minor. So `1.2.0-beta` becomes `1.2.0`, and `1.2.3` becomes `1.3.0`.
 *
 * - `'patch'` If the version has a prerelease, then simply drop the
 * prerelease. Otherwise, increment the patch value. So `1.2.3-beta` becomes
 * `1.2.3` and `1.2.3` becomes `1.2.4`.
 *
 * - `'premajor'` Set the patch and minor versions to `0`, increment the major
 * version, and add a prerelease, using the optional identifier.
 *
 * - `'preminor'` Set the patch version to `0`, increment the minor version,
 * and add a prerelease, using the optional identifier.
 *
 * - `'prepatch'` If a prerelease is already present, increment the patch
 * version, otherwise leave it untouched, and add a prerelease, using the
 * optional identifier.
 *
 * - `'prerelease'` If a prerelease version is present, then behave the same as
 * `'prepatch'`. Otherwise, add a prerelease, using the optional identifier.
 *
 * - `'pre'` This is mostly for use by the other prerelease incrementers.
 *
 *     - If a prerelease identifier is provided:
 *
 *        Update that named portion of the prerelease. For example,
 *        `inc('1.2.3-beta.4', 'pre', 'beta')` would result in `1.2.3-beta.5`.
 *
 *        If there is no prerelease identifier by that name, then replace the
 *        prerelease with `[name]`. So `inc('1.2.3-alpha.4', 'pre', 'beta')`
 *        would result in `1.2.3-beta`.
 *
 *        If the prerelease identifer is present, but has no numeric value
 *        following it, then add `0`. So `inc('1.2.3-beta', 'pre', 'beta')`
 *        would result in `1.2.3-beta.0`.
 *
 *     - If no prerelease identifier is provided:
 *
 *       If there is no current prerelease, then set the prerelease to `0`. So,
 *       `inc('1.2.3', 'pre')` becomes `1.2.3-0`.
 *
 *       If the last item in the prerelease is numeric, then increment it. So,
 *       `inc('1.2.3-beta.3', 'pre')` becomes `1.2.3-beta.4`.
 */
export const inc = (
  version: string | Version,
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
  a: string | Version,
  b: string | Version,
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
  range: string | Range,
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
    throw new TypeError('invalid version: ' + versionA)
  }
  const b = parse(versionB)
  if (!b) {
    throw new TypeError('invalid version: ' + versionB)
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
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) > 0
/** true if versionA is >= versionB. throws on invalid values */
export const gte = (
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) >= 0
/** true if versionA is < versionB. throws on invalid values */
export const lt = (
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) < 0
/** true if versionA is <= versionB. throws on invalid values */
export const lte = (
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) <= 0
/** true if versionA is not equal to versionB. throws on invalid values */
export const neq = (
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) !== 0
/** true if versionA is equal to versionB. throws on invalid values */
export const eq = (
  versionA: string | Version,
  versionB: string | Version,
) => compare(versionA, versionB) === 0

/** extract the major version number, or undefined if invalid */
export const major = (version: string | Version) =>
  parse(version)?.major
/** extract the minor version number, or undefined if invalid */
export const minor = (version: string | Version) =>
  parse(version)?.minor
/** extract the patch version number, or undefined if invalid */
export const patch = (version: string | Version) =>
  parse(version)?.patch
/**
 * extract the list of prerelease identifiers, or undefined if the version
 * is invalid. If no prerelease identifiers are present, returns `[]`.
 */
export const prerelease = (version: string | Version) => {
  const p = parse(version)
  if (!p) return undefined
  return p.prerelease ?? []
}
/**
 * extract the list of build identifiers, or undefined if the version
 * is invalid. If no build identifiers are present, returns `[]`.
 */
export const build = (version: string | Version) => {
  const p = parse(version)
  if (!p) return undefined
  return p.build ?? []
}

/** return all versions that do not have any prerelease identifiers */
export const stable = <T extends string | Version = string | Version>(
  versions: T[],
): T[] =>
  versions.filter(v => {
    const p = parse(v)
    if (!p) return false
    return !p.prerelease?.length
  })
