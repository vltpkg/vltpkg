import { syntaxError, typeError } from '@vltpkg/error-cause'
import { fastSplit } from './fast-split.js'
import { type Range } from './range.js'

const maybeNumber = (s: string): string | number => {
  if (!/^[0-9]+$/.test(s)) return s
  const n = Number(s)
  return n <= Number.MAX_SAFE_INTEGER ? n : s
}

const safeNumber = (
  s: string,
  version: string,
  field: string,
): number => {
  const n = Number(s)
  if (n > Number.MAX_SAFE_INTEGER) {
    throw invalidVersion(
      version,
      `invalid ${field}, must be <= ${Number.MAX_SAFE_INTEGER}`,
    )
  }
  return n
}

const re = {
  prefix: /^[ v=]+/,
  main: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/,
  prerelease: /-([0-9a-zA-Z_.-]+)(?:$|\+)/,
  build: /\+([0-9a-zA-Z_.-]+)$/,
  full: /^[ v=]*(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9a-zA-Z_.-]+))?(?:\+([0-9a-zA-Z_.-]+))?$/,
} as const

const invalidVersion = (
  version: string,
  message: string,
): SyntaxError => {
  const er = syntaxError(
    `invalid version: ${message}`,
    { version },
    Version,
  )
  return er
}

/**
 * Types of incrementing supported by {@link Version#inc}
 */
export type IncrementType =
  | 'major'
  | 'minor'
  | 'patch'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease'
  | 'pre'

/**
 * A parsed object representation of a SemVer version string
 *
 * This is a bit less forgiving than node-semver, in that prerelease versions
 * MUST start with '-'. Otherwise, the allowed syntax is identical.
 */
export class Version {
  /** raw string provided to create this Version */
  raw: string

  /**  major version number */
  major: number
  /** minor version number */
  minor: number
  /** patch version number */
  patch: number
  /**
   * List of `'.'`-separated strings and numbers indicating that this
   * version is a prerelease.
   *
   * This is undefined if the version does not have a prerelease section.
   */
  prerelease?: (string | number)[]
  /**
   * List of `'.'`-separated strings in the `build` section.
   *
   * This is undefined if the version does not have a build.
   */
  build?: string[]

  /** Canonical strict form of this version */
  toString() {
    return `${this.major}.${this.minor}.${this.patch}${
      this.prerelease ? '-' + this.prerelease.join('.') : ''
    }${this.build ? '+' + this.build.join('.') : ''}`
  }

  /** Generate a `Version` object from a SemVer string */
  static parse(version: string) {
    version = version.replace(re.prefix, '').trim()
    if (version.length > 256) {
      throw invalidVersion(
        version,
        'must be less than 256 characters',
      )
    }

    const parsed = version.match(re.full)
    if (!parsed) {
      const main = version.match(re.main)
      if (!main) {
        throw invalidVersion(
          version,
          'no Major.minor.patch tuple present',
        )
      } else {
        throw invalidVersion(
          version,
          'invalid build or patch section',
        )
      }
    }
    const [_, major_, minor_, patch_, prerelease, build] = parsed as [
      string,
      string,
      string,
      string,
      string | undefined,
      string | undefined,
    ]
    const major = safeNumber(major_, version, 'major')
    const minor = safeNumber(minor_, version, 'minor')
    const patch = safeNumber(patch_, version, 'patch')

    return new Version(
      version,
      major,
      minor,
      patch,
      prerelease,
      build,
    )
  }

  constructor(
    version: string,
    major: number,
    minor: number,
    patch: number,
    prerelease: string | undefined,
    build: string | undefined,
  ) {
    this.raw = version
    this.major = major
    this.minor = minor
    this.patch = patch

    // has prerelease and/or build
    if (prerelease) {
      this.prerelease = fastSplit(prerelease, '.', -1, c => {
        if (!c) {
          throw invalidVersion(
            version,
            'invalid prerelease, empty identifiers not allowed',
          )
        }
        return maybeNumber(c)
      })
    }
    if (build) {
      this.build = fastSplit(build, '.', -1, c => {
        if (!c) {
          throw invalidVersion(
            version,
            'invalid build metadata, empty identifiers not allowed',
          )
        }
      })
    }
  }

  /**
   * Return 1 if this is > the provided version, -1 if we're less, or 0 if
   * they are equal.
   *
   * No special handling for prerelease versions, this is just a precedence
   * comparison.
   *
   * This can be used to sort a list of versions by precedence:
   *
   * ```ts
   * const versions: Version[] = getVersionsSomehow()
   * const sorted = versions.sort((a, b) => a.compare(b))
   * ```
   */
  compare(v: Version): -1 | 0 | 1 {
    if (this.major > v.major) return 1
    if (this.major < v.major) return -1
    if (this.minor > v.minor) return 1
    if (this.minor < v.minor) return -1
    if (this.patch > v.patch) return 1
    if (this.patch < v.patch) return -1
    // main tuple is equal now
    // if the version has no pr, we're definitely less than or equal to
    if (!v.prerelease?.length)
      return !this.prerelease?.length ? 0 : -1
    // v has a pr. if we don't, we're > it
    if (!this.prerelease?.length) return 1
    // we both have prereleases
    const len = Math.max(this.prerelease.length, v.prerelease.length)
    const me = this.prerelease
    const thee = v.prerelease
    for (let i = 0; i < len; i++) {
      const m = me[i]
      const t = thee[i]
      if (m === t) continue
      // having a field is > not having it
      if (t === undefined) return 1
      if (m === undefined) return -1
      // string parts are higher precedence than
      if (typeof m !== typeof t) {
        return typeof m === 'string' ? 1 : -1
      }
      return m > t ? 1 : -1
    }
    return 0
  }

  /**
   * The inverse of compare, for sorting version lists in reverse order
   */
  rcompare(v: Version) {
    return -1 * this.compare(v)
  }

  /** true if this version is > the argument */
  greaterThan(v: Version) {
    return this.compare(v) === 1
  }

  /** true if this version is >= the argument */
  greaterThanEqual(v: Version) {
    return this.compare(v) > -1
  }

  /** true if this version is < the argument */
  lessThan(v: Version) {
    return this.compare(v) === -1
  }

  /** true if this version is <= the argument */
  lessThanEqual(v: Version) {
    return this.compare(v) < 1
  }

  /** true if these two versions have equal SemVer precedence */
  equals(v: Version) {
    return this.compare(v) === 0
  }

  /** just compare the M.m.p parts of the version */
  tupleEquals(v: Version) {
    return (
      this.major === v.major &&
      this.minor === v.minor &&
      this.patch === v.patch
    )
  }

  /** true if this version satisfies the range */
  satisfies(r: Range) {
    return r.test(this)
  }

  /**
   * Increment the version in place, in the manner specified.
   *
   * See {@link index.inc} for full description.
   */
  inc(part: IncrementType, prereleaseIdentifier?: string) {
    switch (part) {
      case 'premajor':
        this.prerelease = undefined
        this.patch = 0
        this.minor = 0
        this.major++
        this.inc('pre', prereleaseIdentifier)
        break

      case 'preminor':
        this.prerelease = undefined
        this.patch = 0
        this.minor++
        this.inc('pre', prereleaseIdentifier)
        break

      case 'prepatch':
        this.prerelease = undefined
        this.inc('patch')
        this.inc('pre', prereleaseIdentifier)
        break

      case 'prerelease':
        if (!this.prerelease?.length)
          this.inc('patch', prereleaseIdentifier)
        this.inc('pre', prereleaseIdentifier)
        break

      case 'pre':
        // this is a bit different than node-semver's logic, but simpler
        // always do zero-based incrementing, and either bump the existing
        // numeric pr value, or add a `.0` after the identifier.
        if (!prereleaseIdentifier) {
          if (!this.prerelease?.length) {
            this.prerelease = [0]
            break
          }
          const last = this.prerelease[this.prerelease.length - 1]
          if (typeof last === 'number') {
            this.prerelease[this.prerelease.length - 1] = last + 1
          } else {
            this.prerelease.push(0)
          }
          break
        }
        if (!this.prerelease?.length) {
          this.prerelease = [prereleaseIdentifier]
          break
        }
        const i = this.prerelease.indexOf(
          maybeNumber(prereleaseIdentifier),
        )
        if (i === -1) {
          this.prerelease = [prereleaseIdentifier]
          break
        }
        const baseValue = this.prerelease[i + 1]
        if (typeof baseValue === 'number') {
          this.prerelease[i + 1] = baseValue + 1
          break
        }
        if (i === this.prerelease.length - 1) {
          this.prerelease.push(0)
          break
        }
        this.prerelease.splice(i + 1, 0, 0)
        break

      case 'major':
        if (!this.prerelease?.length || this.minor || this.patch)
          this.major++
        this.prerelease = undefined
        this.patch = 0
        this.minor = 0
        break

      case 'minor':
        if (!this.prerelease?.length || this.patch) this.minor++
        this.prerelease = undefined
        this.patch = 0
        break

      case 'patch':
        if (!this.prerelease?.length) this.patch++
        this.prerelease = undefined
        break

      default:
        throw typeError(
          'Invalid increment identifier',
          {
            version: this,
            found: part,
            validOptions: [
              'major',
              'minor',
              'patch',
              'premajor',
              'preminor',
              'prepatch',
              'prerelease',
              'pre',
            ],
          },
          this.inc,
        )
    }

    this.raw = this.toString()
    return this
  }
}
