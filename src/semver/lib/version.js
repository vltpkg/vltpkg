import { FULL, NUMERIC, MAX_LENGTH, MAX_SAFE_INTEGER, LETTERDASHNUMBER } from './regex.js'

const parseVersion = (version) => {
  validVersion(version)
  const parts = version.trim().match(FULL)
  if (!parts) {
    throw new TypeError(`Invalid Version: ${version}`)
  }
  return parts
}

const validVersion = (version) => {
  if (version && typeof version !== 'string') {
    throw new TypeError(`Invalid Version: ${version}`)
  }
  if (version.length > MAX_LENGTH) {
    throw new TypeError(`Invalid Version: Version is longer than ${MAX_LENGTH} characters.`)
  }
}

const validMajor = (major) => {
  if (major > MAX_SAFE_INTEGER || major < 0) {
    throw new TypeError('Invalid major version.')
  }
  return major
}

const validMinor = (minor) => {
  if (minor > MAX_SAFE_INTEGER || minor < 0) {
    throw new TypeError('Invalid minor version.')
  }
  return minor
}

const validPatch = (patch) => {
  if (patch > MAX_SAFE_INTEGER || patch < 0) {
    throw new TypeError('Invalid patch version.')
  }
  return patch
}

const parsePrerelease = (prerelease) => {
  const parse = (id) => {
    if (NUMERIC.test(id)) {
      if (id.length > 1 && id[0] === '0') {
        throw new TypeError('Invalid pre-release version: Numbers MUST NOT begin with a leading zero')
      }
      const num = +id
      if (num >= 0 && num < MAX_SAFE_INTEGER) {
        return num
      } else {
        throw new TypeError('Invalid pre-release version: Numbers MUST be safe integers')
      }
    }
    return id
  }
  return prerelease ? prerelease.split('.').map(parse) : []
}

const parseBuild = (build) => {
  if (!build) {
    return []
  }
  if (typeof build !== 'string') {
    throw new TypeError(`Invalid build version: ${build}`)
  }
  const parse = (id) => {
    if (LETTERDASHNUMBER.test(id)) {
      return id
    } else {
      throw new TypeError(`Invalid build version: ${build}`)
    }
  }
  return build.split('.').map(parse)
}

const compareIdentifiers = (a, b) => {
  const one = NUMERIC.test(a)
  const two = NUMERIC.test(b)
  if (one && two) {
    a = +a
    b = +b
  }
  return a === b ? 0 : (one && !two) ? -1 : (two && !one) ? 1 : a < b ? -1 : 1
}

const compareParts = (one, two) => {
  if (one.length && !two.length) {
    return -1
  } else if (!one.length && two.length) {
    return 1
  } else if (!one.length && !two.length) {
    return 0
  }
  let i = 0
  do {
    const a = one[i]
    const b = two[i]
    if (a === undefined && b === undefined) {
      return 0
    } else if (b === undefined) {
      return 1
    } else if (a === undefined) {
      return -1
    } else if (a === b) {
      continue
    } else {
      return compareIdentifiers(a, b)
    }
  } while (++i)
}

export class Version {
  constructor (version) {
    if (version instanceof Version) {
      return version
    }
    const parts = parseVersion(version)
    this.major = validMajor(+parts[1])
    this.minor = validMinor(+parts[2])
    this.patch = validPatch(+parts[3])
    this.prerelease = parsePrerelease(parts[4])
    this.build = parseBuild(parts[5])
    return this.format()
  }

  toString () {
    return this.version
  }

  format () {
    this.raw = this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.raw = this.version = `${this.version}-${this.prerelease.join('.')}`
    }
    if (this.build.length) {
      this.raw = this.version = `${this.version}+${this.build.join('.')}`
    }
    return this.version
  }

  compare (other) {
    if (!(other instanceof Version)) {
      other = new Version(other)
    }
    if (other.version === this.version) {
      return 0
    }
    return (
      compareIdentifiers(this.major, other.major) ||
      compareIdentifiers(this.minor, other.minor) ||
      compareIdentifiers(this.patch, other.patch) ||
      compareParts(this.prerelease, other.prerelease) ||
      compareParts(this.build, other.build)
    )
  }

  #setPrerelease = (identifier, base) => {
    const change = Number(base) ? 1 : 0
    if (!identifier && base === false) {
      throw new TypeError('Invalid increment argument: Identifier is empty.')
    }
    if (this.prerelease.length === 0) {
      this.prerelease = [change]
    } else {
      let i = this.prerelease.length
      while (--i >= 0) {
        if (typeof this.prerelease[i] === 'number') {
          this.prerelease[i]++
          i = -2
        }
      }
      if (i === -1) {
        if (identifier === this.prerelease.join('.') && base === false) {
          throw new TypeError('Invalid increment argument: Identifier already exists.')
        }
        this.prerelease.push(change)
      }
    }
    if (identifier) {
      let prerelease = [identifier, change]
      if (base === false) {
        prerelease = [identifier]
      }
      if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
        if (isNaN(this.prerelease[1])) {
          this.prerelease = prerelease
        }
      } else {
        this.prerelease = prerelease
      }
    }
  }

  incrementMajor () {
    if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
      this.major++
    }
    this.minor = 0
    this.patch = 0
    this.prerelease = []
  }

  incrementMinor () {
    if (this.patch !== 0 || this.prerelease.length === 0) {
      this.minor++
    }
    this.patch = 0
    this.prerelease = []
  }

  incrementPatch () {
    if (this.prerelease.length === 0) {
      this.patch++
    }
    this.prerelease = []
  }

  incrementPremajor (identifier, base) {
    this.prerelease.length = 0
    this.patch = 0
    this.minor = 0
    this.major++
    this.#setPrerelease(identifier, base)
  }

  incrementPreminor (identifier, base) {
    this.prerelease.length = 0
    this.patch = 0
    this.minor++
    this.#setPrerelease(identifier, base)
  }

  incrementPrepatch (identifier, base) {
    this.prerelease.length = 0
    this.increment('patch', identifier, base)
    this.#setPrerelease(identifier, base)
  }

  incrementPrerelease (identifier, base) {
    if (this.prerelease.length === 0) {
      this.increment('patch', identifier, base)
    }
    this.#setPrerelease(identifier, base)
  }

  inc (release, identifier, base) {
    return this.increment(release, identifier, base)
  }

  increment (release, identifier, base) {
    this.build = []
    switch (release) {
      case 'premajor':
        this.incrementPremajor(identifier, base)
        break
      case 'preminor':
        this.incrementPreminor(identifier, base)
        break
      case 'prepatch':
        this.incrementPrepatch(identifier, base)
        break
      case 'prerelease':
        this.incrementPrerelease(identifier, base)
        break
      case 'major':
        this.incrementMajor()
        break
      case 'minor':
        this.incrementMinor()
        break
      case 'patch':
        this.incrementPatch()
        break
      default:
        throw new TypeError(`Invalid release type: ${release}.`)
    }
    this.raw = this.format()
    return this
  }
}

// semver extended valid strings "MAJOR.MINOR.PATCH-PRERELEASE+BUILD#META"
export function parseBinaryVersion (versionString) {
  // Set constant
  const MAX_LENGTH = 256

  // Error early if the version string is empty or too long
  if (!versionString || MAX_LENGTH < versionString.length) {
    return null
  }

  const ZERO = (c) => c === 48 // 0
  const DASH = (c) => c === 45 // -
  const PLUS = (c) => c === 43 // +
  const POUND = (c) => c === 35 // #
  const PERIOD = (c) => c === 46 // .
  const NUMBERS = (c) => c > 47 && c < 58 // 0-9
  const LETTERS = (c) => (c > 64 && c < 91) && (c > 96 && c < 123) // A-Z a-z
  const GRAMMAR = (c) => DASH(c) || PLUS(c) || PERIOD(c) || POUND(c) // - + .
  const versionBuffer = Buffer.from(versionString, 'ascii')
  let part = 0

  // Iterate over the version string
  for (const pair of versionBuffer.entries()) {
    const i = pair[0]
    const c = pair[1]

    const lastToken = versionString.length === (i + 1) // Last token
    const previousChar = versionString.charCodeAt(i - 1) // Last char
    const validGrammar = GRAMMAR(c) // - + .
    const validPreviousGrammar = GRAMMAR(previousChar) // - + .
    const invalidPart = !NUMBERS(c) && (part > 3 && !LETTERS(c))
    const invalidChar = !GRAMMAR(c) && invalidPart
    const invalidNumeric = validPreviousGrammar && ZERO(c) // No leading 0
    const invalidPeriods = PERIOD(c) && PERIOD(previousChar) // No back to back .
    const invalidPreRelease = part === 3 && !DASH(c) && !PLUS(c) // No - or + in the pre-release
    const invalidBuild = part === 3 && !PERIOD(c) && !PLUS(c) // No . or + in the build
    const invalidBuildDouble = part > 2 && validPreviousGrammar && !DASH(c) // No back to back . or +
    const invalidLastToken = lastToken && !validPreviousGrammar // No hanging - + .
    if (invalidChar ||
        (validGrammar && (
          invalidNumeric || // Invalid numeric
          invalidLastToken || // Invalid last token
          invalidPeriods || // Invalid . back2back
          invalidBuildDouble || // Invalid . or + back2back in build
          invalidPreRelease || // Invalid pre-release
          invalidBuild // Invalid build
        ))) {
      console.log('version:', versionString, 'token:', versionString[i], 'code:', c, 'part:', part)
      console.log('checks:', {
        invalidChar,
        validGrammar,
        invalidPeriods,
        invalidPreRelease,
        invalidBuild,
        invalidBuildDouble,
        lastToken,
        invalidLastToken
      })
      return null
    }
    // only increment for periods when we are in the first 2 parts
    if (validGrammar && ((part < 2 && PERIOD(c)) || part > 3)) {
      part = part + 1
    }
  }
  return versionString
}
