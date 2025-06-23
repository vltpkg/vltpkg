![semver](https://github.com/user-attachments/assets/8ace86b8-cf67-43f0-991d-b9c1a069ffa0)

# @vltpkg/semver

A library for parsing, validating & comparing Semantic Versions used
by `vlt`.

**[Usage](#usage)** · **[Functions](#functions)** ·
**[Differences from node-semver](#differences)**

## Usage

```js
import {
  parse,
  valid,
  parseRange,
  validRange,
  increment,
  satisfies,
  intersects,
  sort,
  compare,
  rsort,
  rcompare,
  filter,
  filterMethod,
  gt,
  lt,
  gte,
  lte,
  eq,
  neq,
  maxSatisfying,
  sortedMaxSatisfying,
  rsortedMaxSatisfying,
  Version,
  Range,
  Comparator,
} from '@vltpkg/semver'
```

## Functions

- `parse(v)`: Attempt to parse a string as a semantic version,
  returning either a `Version` object or `undefined`.
- `valid(v)`: Return true if the version is valid
- `increment(v, type, [identifier])` Increment the specified part of
  the version, and return the resulting object. If a Version object is
  provided, it will be modified in-place.
- `major(v)`: Return the major version number.
- `minor(v)`: Return the minor version number.
- `patch(v)`: Return the patch version number.
- `prerelease(v)`: Returns an array of prerelease components, or
  `undefined` if none exist. Example:
  `prerelease('1.2.3-alpha.1') -> ['alpha', 1]`
- `build(v)`: Returns an array of build components, or `undefined` if
  none exist. Example:
  `prerelease('1.2.3+linux.33') -> ['linux', '33']`
- `stable(v)`: Returns an array of releases that are considered
  "stable" (ie. no prereleases), or an empty array if non exist.

### Comparison

These functions all compare version strings or objects by their SemVer
precedence. (Note that build metadata is not considered, as per the
SemVer 2.0 specification.)

Unless otherwise noted, they throw an error on invalid versions.

- `gt(v1, v2)`: `v1 > v2`
- `gte(v1, v2)`: `v1 >= v2`
- `lt(v1, v2)`: `v1 < v2`
- `lte(v1, v2)`: `v1 <= v2`
- `eq(v1, v2)`: `v1 == v2` This is true even if they're not the exact
  same string. You already know how to compare strings.
- `neq(v1, v2)`: `v1 != v2` The opposite of `eq`.
- `compare(v1, v2)`: Return `0` if `v1 == v2`, or `1` if `v1` is
  greater, or `-1` if `v2` is greater. Sorts in ascending order if
  passed to `Array.sort()`.
- `sortMethod(v1, v2)`: The same as `compare`, except that invalid
  versions are sorted to the end of the list rather than throwing an
  error.
- `rcompare(v1, v2)`: Inverse of `compare`
- `rsortMethod(v1, v2)`: Inverse of `sortMethod`. (Invalid versions
  are still sorted to the end of the list.)

### Ranges

- `validRange(range)`: Return the valid range or null if it's not
  valid
- `satisfies(version, range)`: Return true if the version satisfies
  the range.
- `intersects(range1, range2)`: Return true if the two ranges
  intersect (have any version that satisfies both ranges).
- `highest(versions, range)`: Return the highest version in the list
  that satisfies the range, or `null` if none of them do.
- `sortedHighest(versions, range)`: Optimized form of `highest`, if
  the version list is known to be sorted in ascending SemVer
  precedence order. If the list is not sorted already, may return an
  incorrect result.
- `rsortedHighest(versions, range)`: Optimized form of `highest`, if
  the version list is known to be sorted in descending SemVer
  precedence order. If the list is not sorted already, may return an
  incorrect result.
- `lowest(versions, range)`: Return the lowest version in the list
  that satisfies the range, or `null` if none of them do.
- `sortedLowest(versions, range)`: Optimized form of `lowest`, if the
  version list is known to be sorted in ascending SemVer precedence
  order. If the list is not sorted already, may return an incorrect
  result.
- `rsortedLowest(versions, range)`: Optimized form of `lowest`, if the
  version list is known to be sorted in descending SemVer precedence
  order. If the list is not sorted already, may return an incorrect
  result.

### Classes

- `Version` Object representation of a SemVer version. Create from a
  string with `Version.parse(versionString)`.
- `Range` Representation of a version range.
- `Comparator` The representation of a single part of a Range, which
  does most of the heavy lifting for parsing and testing versions.
  This is an internal class, and should usually not be used directly.

## Differences

### Differences from `node-semver` (the one used by `npm`)

- The API is slightly different. Most notably, `@vltpkg/semver` lacks
  some methods that are not needed by `vlt`. Of course, these may be
  added eventually if we find a need for them.

- Build metadata is preserved on `Version` objects and in `toString()`
  values.

- It's significantly faster. About 40-50% faster at parsing versions,
  15-20% faster at parsing ranges, and 60-70% faster at testing
  versions against ranges, which results in the `highest()` method
  being around 2-3 times as fast as node-semver's `maxSatisfying`.

  Of course, if you're not writing a package manager or some other
  program that does millions of version comparisons in the course of
  its operations, this is likely not relevant.)

- There's no switch for `loose` vs `strict` mode. It just always works
  the same way.
  - A leading `v` or `=` on a version is always allowed
  - Prereleases _must_ be prefixed by a `-`.
  - Excessively large numbers in prerelease identifiers are treated as
    strings, rather than throwing an error.

  For example, `v1.2.3` will be parsed, but `1.2.3foo` will be
  considered invalid. `toString()` values are always the strict
  representation.

- There is no CLI implementation, and thus, no dependencies.
