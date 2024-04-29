import { Version } from './version.js'
import { Range } from './range.js'
import { satisfies, compare } from './compare.js'

const parse = (version, throwErrors = false) => {
  if (version instanceof Version) {
    return version
  }
  try {
    return new Version(version)
  } catch (er) {
    if (!throwErrors) {
      return null
    }
    throw er
  }
}
const prerelease = (version) => {
  const parsed = parse(version)
  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
}
const patch = (a) => new Version(a).patch
const minor = (a) => new Version(a).minor
const major = (a) => new Version(a).major

const valid = (version) => {
  const v = parse(version)
  return v ? v.version : null
}
const validRange = (range) => {
  try {
    return new Range(range).range || '*'
  } catch (er) {
    return null
  }
}
const diff = (version1, version2) => {
  const v1 = parse(version1, true)
  const v2 = parse(version2, true)
  const comparison = v1.compare(v2)

  if (comparison === 0) {
    return null
  }

  const v1Higher = comparison > 0
  const highVersion = v1Higher ? v1 : v2
  const lowVersion = v1Higher ? v2 : v1
  const highHasPre = !!highVersion.prerelease.length
  const lowHasPre = !!lowVersion.prerelease.length

  if (lowHasPre && !highHasPre) {
    if (!lowVersion.patch && !lowVersion.minor) {
      return 'major'
    }
    if (highVersion.patch) {
      return 'patch'
    }
    if (highVersion.minor) {
      return 'minor'
    }
    return 'major'
  }

  const prefix = highHasPre ? 'pre' : ''

  if (v1.major !== v2.major) {
    return prefix + 'major'
  }
  if (v1.minor !== v2.minor) {
    return prefix + 'minor'
  }
  if (v1.patch !== v2.patch) {
    return prefix + 'patch'
  }
  return 'prerelease'
}

const simplify = (versions, range) => {
  const set = []
  let first = null
  let prev = null
  const v = versions.sort((a, b) => compare(a, b))
  for (const version of v) {
    const included = satisfies(version, range)
    if (included) {
      prev = version
      if (!first) {
        first = version
      }
    } else {
      if (prev) {
        set.push([first, prev])
      }
      prev = null
      first = null
    }
  }
  if (first) {
    set.push([first, null])
  }
  const ranges = []
  for (const [min, max] of set) {
    if (min === max) {
      ranges.push(min)
    } else if (!max && min === v[0]) {
      ranges.push('*')
    } else if (!max) {
      ranges.push(`>=${min}`)
    } else if (min === v[0]) {
      ranges.push(`<=${max}`)
    } else {
      ranges.push(`${min} - ${max}`)
    }
  }
  const simplified = ranges.join(' || ')
  const original = typeof range.raw === 'string' ? range.raw : String(range)
  return simplified.length < original.length ? simplified : range
}

export {
  parse,
  major,
  minor,
  patch,
  prerelease,
  diff,
  valid,
  validRange,
  simplify
}
