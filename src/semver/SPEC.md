# Semantic Versions 3.0.0-rc.1

## Introduction

Software versions are a communication mechanism. This specification outlines a
set of rules and requirements that dictate how software version numbers can be
assigned, incremented, grouped, compared and matched.

For this system to work, you **MUST** declare a public API. This **MAY**
consist of documentation or be enforced by the software itself. Regardless, it
is important that an API is clear and precise. Changes to your public API are
communicated with specific increments to your software's "Semantic Version".

## Specification

The key words "**MUST**", "**MUST NOT**", "**REQUIRED**", "**SHALL**",
"**SHALL NOT**", "**SHOULD**", "**SHOULD NOT**", "**RECOMMENDED**", "**MAY**",
and "**OPTIONAL**" in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### Versions

Given a semantic version `MAJOR.MINOR.PATCH`, increment the:

- `MAJOR` version when you make incompatible API changes
- `MINOR` version when you add functionality in a backward compatible manner
- `PATCH` version when you make backward compatible bug fixes

Given a semantic version with optional labels `MAJOR.MINOR.PATCH-PRERELEASE+BUILD`:

- `PRERELEASE` is ...
- `BUILD` is ...

1. Software using semantic versions **MUST** declare a public API. This API
could be declared in the code itself or exist strictly in documentation.
However it is done, it **SHOULD** be precise and comprehensive.

1. A normal version number **MUST** take the form `X.Y.Z` where `X`, `Y`, and
`Z` are non-negative integers, and **MUST NOT** contain leading zeroes. `X` is
the major version, `Y` is the minor version, and `Z` is the patch version. Each
element **MUST** increase numerically. For instance: `1.9.0` -> `1.10.0` ->
`1.11.0`.

1. A semantic version is ...

2. A partical version is ...

3. A set  is ...

4. An ordered set is ...

5. An unordered set is ...
  
6. A range is ...
  
7. A comparator is ...

8. Once a versioned package has been released, the contents of that version
**MUST NOT** be modified. Any modifications **MUST** be released as a new version.

1. Major version zero (`0.y.z`) is for initial development. Anything **MAY** change
at any time. The public API **SHOULD NOT** be considered stable.

1. Version `1.0.0` **SHOULD** be the first stable release and **MUST** define the
public API. The way in which the version number
is incremented after this release is dependent on this public API and how it
changes.

1. Patch version `Z` (`x.y.Z | x > 0`) **MUST** be incremented if only backward
compatible bug fixes are introduced. A bug fix is defined as an internal
change that fixes incorrect behavior.

1. Minor version Y (`x.Y.z | x > 0`) **MUST** be incremented if new, backward
compatible functionality is introduced to the public API. It **MUST** be
incremented if any public API functionality is marked as deprecated. It **MAY** be
incremented if substantial new functionality or improvements are introduced
within the private code. It **MAY** include patch level changes. Patch version
**MUST** be reset to 0 when minor version is incremented.

1. Major version `X` (`X.y.z | X > 0`) **MUST** be incremented if any backward
incompatible changes are introduced to the public API. It MAY also include minor
and patch level changes. Patch and minor versions **MUST** be reset to 0 when major
version is incremented.

1. A pre-release version **MAY** be denoted by appending a hyphen and a
series of dot separated identifiers immediately following the patch
version. Identifiers **MUST** comprise only ASCII alphanumerics and hyphens
[0-9A-Za-z-]. Identifiers **MUST NOT** be empty. Numeric identifiers **MUST
NOT** include leading zeroes. Pre-release versions have a lower
precedence than the associated normal version. A pre-release version
indicates that the version is unstable and might not satisfy the
intended compatibility requirements as denoted by its associated
normal version. Examples: `1.0.0-alpha, 1.0.0-alpha.1, 1.0.0-0.3.7,
1.0.0-x.7.z.92, 1.0.0-x-y-z.\-\-`.

1. Build versions **MAY** be denoted by appending a plus sign and a series of dot
separated identifiers immediately following the patch or pre-release version.
Identifiers **MUST** comprise only ASCII alphanumerics and hyphens [0-9A-Za-z-].
Identifiers **MUST NOT** be empty. Build version **MUST** be ignored when determining
version precedence of normal versions. Thus two versions that differ only in the
build, have the same precedence. Examples: `1.0.0-alpha+001, 1.0.0+20130313144700,
1.0.0-beta+exp.sha.5114f85, 1.0.0+21AF26D3\-\-\-\-117B344092BD`.

1. Precedence refers to how versions are compared to each other when ordered.

   1. Precedence **MUST** be calculated by separating the version into major,
      minor, patch, pre-release, and build identifiers in that order.

   2. Precedence is determined by the first difference when comparing each of
      these identifiers from left to right as follows: Major, minor, and patch
      versions are always compared numerically.

      Example: `1.0.0 < 2.0.0 < 2.1.0 < 2.1.1`.

   3. When major, minor, and patch are equal, a pre-release version has lower
      precedence than a normal version:

      Example: `1.0.0-alpha < 1.0.0`.

   4. Precedence for two pre-release or build versions with the same major,
      minor, and patch version **MUST** be determined by comparing each dot
      separated identifier from left to right until a difference is found as
      follows:

      1. Identifiers consisting of only digits are compared numerically.

      2. Identifiers with letters or hyphens are compared lexically in ASCII
         sort order.

      3. Numeric identifiers always have lower precedence than non-numeric
         identifiers.

      4. A larger set of pre-release fields has a higher precedence than a
         smaller set, if all of the preceding identifiers are equal.

      Example: `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 
      1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0`.

### Sets

1. A Set **MUST** contain a collection of semantic versions.
1. All potential MAJOR, MINOR, PATCH & PRE-RELEASE versions **MUST** be interpreted as valid Subsets to any set.
1. A Set **MAY** be sorted according to the version precedence.
1. Sets **MAY** contain duplicate versions.
1. Duplicate versions in a set **MUST** have unique build metadata.
1. An Ordered Set **MUST** be sorted by their precedence.

Examples:

- Valid set: `5.6.7, 3.2.1+build.123, 3.2.1, 4.0.0, 1.16.3, 0.9.8`
- Invalid set: `3.2.1, 3.2.1`
- Valid set: `3.2.1, 3.2.1+build.123`
- Ordered set: `0.9.8, 1.16.3, 3.2.1, 3.2.1+build.123, 4.0.0, 5.6.7`
- Unordered set: `5.6.7, 3.2.1+build.123, 3.2.1, 4.0.0, 1.16.3, 0.9.8`
- Normal set: `0.9.8, 1.16.3, 3.2.1, 4.0.0, 5.6.7`
- Prerelease set: `1.0.0-pre.1, 1.0.0-pre.2, 1.0.0-pre.3`
- Build set: `1.0.0+build.1, 1.0.0+build.2, 1.0.0+build.3`

### Ranges

A `range` is a set of `comparators` which specify versions
that satisfy the range.

### Operators

A `operator` is a character or set of characters which express how to compare a version.

Supported operators are:

* `<` Less than
* `>` Greater than
* `=` Equal to
* `<=` Less than or equal to
* `>=` Greater than or equal to

### Comparator

A `comparator` is composed of an `operator` & a `version`. Comparators can be joined by whitespace to form a `comparator set`, which is satisfied by the **intersection** of all of the comparators it includes.

#### Examples

- `>=1.2.7` 
  - matches versions `1.2.7`, `1.2.8`, `2.5.3`, & `1.3.9`
  - does not match versions `1.2.6` or `1.1.0`
- `>1`
  - is equivalent to `>=2.0.0`
  - matches versions `2.0.0` & `3.1.0`
  - does not match versions `1.0.1` or `1.1.0`

A range is composed of one or more comparator sets, joined by `||`.  A
version matches a range if and only if every comparator in at least
one of the `||`-separated comparator sets is satisfied by the version.

For example, the range `>=1.2.7 <1.3.0` would match the versions
`1.2.7`, `1.2.8`, and `1.2.99`, but not the versions `1.2.6`, `1.3.0`,
or `1.1.0`.

The range `1.2.7 || >=1.2.9 <2.0.0` would match the versions `1.2.7`,
`1.2.9`, and `1.4.6`, but not the versions `1.2.8` or `2.0.0`.

> TODO: Remove "Prerelease Identifier Base"

### Advanced Range Syntax

Advanced range syntax desugars to primitive comparators in
deterministic ways.

Advanced ranges may be combined in the same way as primitive
comparators using white space or `||`.

#### Hyphen Ranges `X.Y.Z - A.B.C`

Specifies an inclusive set.

* `1.2.3 - 2.3.4` := `>=1.2.3 <=2.3.4`

If a partial version is provided as the first version in the inclusive
range, then the missing pieces are replaced with zeroes.

* `1.2 - 2.3.4` := `>=1.2.0 <=2.3.4`

If a partial version is provided as the second version in the
inclusive range, then all versions that start with the supplied parts
of the tuple are accepted, but nothing that would be greater than the
provided tuple parts.

* `1.2.3 - 2.3` := `>=1.2.3 <2.4.0-0`
* `1.2.3 - 2` := `>=1.2.3 <3.0.0-0`

#### X-Ranges `1.2.x` `1.X` `1.2.*` `*`

Any of `X`, `x`, or `*` may be used to "stand in" for one of the
numeric values in the `[major, minor, patch]` tuple.

* `*` := `>=0.0.0` (Any non-prerelease version satisfies, unless
  `includePrerelease` is specified, in which case any version at all
  satisfies)
* `1.x` := `>=1.0.0 <2.0.0-0` (Matching major version)
* `1.2.x` := `>=1.2.0 <1.3.0-0` (Matching major and minor versions)

A partial version range is treated as an X-Range, so the special
character is in fact optional.

* `""` (empty string) := `*` := `>=0.0.0`
* `1` := `1.x.x` := `>=1.0.0 <2.0.0-0`
* `1.2` := `1.2.x` := `>=1.2.0 <1.3.0-0`

#### Tilde Ranges `~1.2.3` `~1.2` `~1`

Allows patch-level changes if a minor version is specified on the
comparator.  Allows minor-level changes if not.

* `~1.2.3` := `>=1.2.3 <1.(2+1).0` := `>=1.2.3 <1.3.0-0`
* `~1.2` := `>=1.2.0 <1.(2+1).0` := `>=1.2.0 <1.3.0-0` (Same as `1.2.x`)
* `~1` := `>=1.0.0 <(1+1).0.0` := `>=1.0.0 <2.0.0-0` (Same as `1.x`)
* `~0.2.3` := `>=0.2.3 <0.(2+1).0` := `>=0.2.3 <0.3.0-0`
* `~0.2` := `>=0.2.0 <0.(2+1).0` := `>=0.2.0 <0.3.0-0` (Same as `0.2.x`)
* `~0` := `>=0.0.0 <(0+1).0.0` := `>=0.0.0 <1.0.0-0` (Same as `0.x`)
* `~1.2.3-beta.2` := `>=1.2.3-beta.2 <1.3.0-0` 

Note that prereleases in
  the `1.2.3` version will be allowed, if they are greater than or
  equal to `beta.2`.  So, `1.2.3-beta.4` would be allowed, but
  `1.2.4-beta.2` would not, because it is a prerelease of a
  different `[major, minor, patch]` tuple.

#### Caret Ranges `^1.2.3` `^0.2.5` `^0.0.4`

Allows changes that do not modify the left-most non-zero element in the
`[major, minor, patch]` tuple.  In other words, this allows patch and
minor updates for versions `1.0.0` and above, patch updates for
versions `0.X >=0.1.0`, and *no* updates for versions `0.0.X`.

Many authors treat a `0.x` version as if the `x` were the major
"breaking-change" indicator.

Caret ranges are ideal when an author may make breaking changes
between `0.2.4` and `0.3.0` releases, which is a common practice.
However, it presumes that there will *not* be breaking changes between
`0.2.4` and `0.2.5`.  It allows for changes that are presumed to be
additive (but non-breaking), according to commonly observed practices.

* `^1.2.3` := `>=1.2.3 <2.0.0-0`
* `^0.2.3` := `>=0.2.3 <0.3.0-0`
* `^0.0.3` := `>=0.0.3 <0.0.4-0`
* `^1.2.3-beta.2` := `>=1.2.3-beta.2 <2.0.0-0` Note that prereleases in
  the `1.2.3` version will be allowed, if they are greater than or
  equal to `beta.2`.  So, `1.2.3-beta.4` would be allowed, but
  `1.2.4-beta.2` would not, because it is a prerelease of a
  different `[major, minor, patch]` tuple.
* `^0.0.3-beta` := `>=0.0.3-beta <0.0.4-0`  Note that prereleases in the
  `0.0.3` version *only* will be allowed, if they are greater than or
  equal to `beta`.  So, `0.0.3-pr.2` would be allowed.

When parsing caret ranges, a missing `patch` value desugars to the
number `0`, but will allow flexibility within that value, even if the
major and minor versions are both `0`.

* `^1.2.x` := `>=1.2.0 <2.0.0-0`
* `^0.0.x` := `>=0.0.0 <0.1.0-0`
* `^0.0` := `>=0.0.0 <0.1.0-0`

A missing `minor` and `patch` values will desugar to zero, but also
allow flexibility within those values, even if the major version is
zero.

* `^1.x` := `>=1.0.0 <2.0.0-0`
* `^0.x` := `>=0.0.0 <1.0.0-0`

### Approximate Ranges

The operator `~>` treats the last digit of corresponding version as
the beginning of the range & matches only within that respective value.

- `~>1` is equivalent to the range `>=1.0.0, <2.0.0-0` or `^1.x`
- `~>1.2` is equivalent to the range `>=1.2.0, <1.2.0-0` or `^1.2.x`
- `~>1.2.3` is equivalent to the range `>=1.2.3, <1.3.0-0` or `~1.2.3`
- `~>1.2.3-alpha.1` is equivalent 


Note that, since ranges may be non-contiguous, a version might not be
greater than a range, less than a range, *or* satisfy a range!  For
example, the range `1.2 <1.2.9 || >2.0.0` would have a hole from `1.2.9`
until `2.0.0`, so the version `1.2.10` would not be greater than the
range (because `2.0.1` satisfies, which is higher), nor less than the
range (since `1.2.8` satisfies, which is lower), and it also does not
satisfy the range.

If you want to know if a version satisfies or does not satisfy a
range, use the `satisfies(version, range)` function.

## FAQ

### What are the differences between `semver.org`?

**Semantic Version 3.0.0** is a spirtual successor to
[`Semantic Versioning 2.0.0-rc.1`](https://semver.org/spec/v2.0.0-rc.1.html)
which originally introduced the concept of optional prerelease & build versions.
Notably, `Semantic Versioning 2.0.0-rc.2` changed the meaning of build versions
to "build metadata" making those definitions semantically useless. Semantic
Versions reverts this change while also additing new definitions for Sets,
Ranges & Comparitors. These differences cover essential gaps required to
meaningfully handle software versions.

### License

[Apache License 2.0]()
