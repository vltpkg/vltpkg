
<img src="https://github.com/darcyclarke/octofiles/assets/459713/8ee74129-34e6-4bd4-8686-82954f424709" width="85" />

# Semantic Versions

Parsing, validating & comparing Semantic Versions as defined by `semver.xyz`

### Usage

```js
import { 
  parse,
  valid,
  major,
  minor,
  patch,
  prerelease,
  build,
  diff,
  cmp,
  eq,
  neq,
  lt,
  lte,
  gt,
  gte
  valid,
  simplify,
  compare,
  subset,
  minimum,
  lowest,
  highest,
  intersects,
  increment,
  satisfies,
  sort,
  rsort,
  outside,
  ltr,
  gtr
} from 'semver.xyz'
```

## Functions

* `valid(v)`: Return the parsed version, or null if it's not valid.
* `increment(v, type)`: Return the version incremented by the type (`major`,   `premajor`, `minor`, `preminor`, `patch`,
  `prepatch`, or `prerelease`), or null if it's not valid
  * `premajor` in one call will bump the version up to the next major
    version and down to a prerelease of that major version.
    `preminor`, and `prepatch` work the same way.
  * If called from a non-prerelease version, the `prerelease` will work the
    same as `prepatch`. It increments the patch version, then makes a
    prerelease. If the input version is already a prerelease it simply
    increments it.
* `prerelease(v)`: Returns an array of prerelease components, or null
  if none exist. Example: `prerelease('1.2.3-alpha.1') -> ['alpha', 1]`
* `stable(v)`: Returns an array of releases that are considered "stable" (ie. no prereleases), or null if non exist.
* `major(v)`: Return the major version number.
* `minor(v)`: Return the minor version number.
* `patch(v)`: Return the patch version number.
* `intersects(r1, r2, loose)`: Return true if the two supplied ranges
  or comparators intersect.
* `parse(v)`: Attempt to parse a string as a semantic version, returning either
  a `SemVer` object or `null`.

### Comparison

* `gt(v1, v2)`: `v1 > v2`
* `gte(v1, v2)`: `v1 >= v2`
* `lt(v1, v2)`: `v1 < v2`
* `lte(v1, v2)`: `v1 <= v2`
* `eq(v1, v2)`: `v1 == v2` This is true if they're logically equivalent,
  even if they're not the exact same string.  You already know how to
  compare strings.
* `neq(v1, v2)`: `v1 != v2` The opposite of `eq`.
* `cmp(v1, comparator, v2)`: Pass in a comparison string, and it'll call
  the corresponding function above.  `"==="` and `"!=="` do simple
  string comparison, but are included for completeness.  Throws if an
  invalid comparison string is provided.
* `compare(v1, v2)`: Return `0` if `v1 == v2`, or `1` if `v1` is greater, or `-1` if
  `v2` is greater. Sorts in ascending order if passed to `Array.sort()`.
* `diff(v1, v2)`: Returns difference between two versions by the release type
  (`major`, `premajor`, `minor`, `preminor`, `patch`, `prepatch`, or `prerelease`),
  or null if the versions are the same.

### Comparators

* `intersects(comparator)`: Return true if the comparators intersect

### Ranges

* `validRange(range)`: Return the valid range or null if it's not valid
* `satisfies(version, range)`: Return true if the version satisfies the
  range.
* `highest(versions, range)`: Return the highest version in the list
  that satisfies the range, or `null` if none of them do.
* `lowest(versions, range)`: Return the lowest version in the list
  that satisfies the range, or `null` if none of them do.
* `minimum(range)`: Return the lowest version that can possibly match
  the given range.
* `gtr(version, range)`: Return `true` if version is greater than all the
  versions possible in the range.
* `ltr(version, range)`: Return `true` if version is less than all the
  versions possible in the range.
* `outside(version, range, hilo)`: Return true if the version is outside
  the bounds of the range in either the high or low direction.  The
  `hilo` argument must be either the string `'>'` or `'<'`.  (This is
  the function called by `gtr` and `ltr`.)
* `intersects(range)`: Return true if any of the ranges comparators intersect
* `simplify(versions, range)`: Return a "simplified" range that
  matches the same items in `versions` list as the range specified.  Note
  that it does *not* guarantee that it would match the same versions in all
  cases, only for the set of versions provided.  This is useful when
  generating ranges by joining together multiple versions with `||`
  programmatically, to provide the user with something a bit more
  ergonomic.  If the provided range is shorter in string-length than the
  generated range, then that is returned.
* `subset(subRange, superRange)`: Return `true` if the `subRange` range is
  entirely contained by the `superRange` range.

## FAQ

##### What are the differences between `npm`'s `semver` package?
- this library uses `semver.xyz` (ref. `SPEC.md` outlines "Semantic Versioning 3.0.0")
- build metadata is preserved
- no dependencies
  - ie. no CLI implementation
  - note: if you want this, run `vlt exec ...`
- no coercion
  - ie. loose comparison is not optional (ex. `v1` will fail to parse but `1` is fine - ref. https://semver.org/#is-v123-a-semantic-version)
  - note: if you want this, coerce your versions prior to comparison
- comparing prereleases is not optional
  - note: if you want this, pre-prune the set of versions or use prerelease-specific methods
