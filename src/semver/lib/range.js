import { Comparator } from './compare.js'
import { Version } from './version.js'

// `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
// `> 1.2.3 < 1.2.5`
// -----------------------------
// `~ 1.2.3` is bad
// `^ 1.2.3` is bad
// -----------------------------
// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
// ~0.0.1 --> >=0.0.1 <0.1.0-0
// -----------------------------
// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
// ^1.2.3 --> >=1.2.3 <2.0.0-0
// ^1.2.0 --> >=1.2.0 <2.0.0-0
// ^0.0.1 --> >=0.0.1 <0.0.2-0
// ^0.1.0 --> >=0.1.0 <0.2.0-0
// -----------------------------
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
// -----------------------------

const MAX_LENGTH = 256
// const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991

const LOOKUP = {
  GRAMMAR: {
    ' ': false,
    '^': true,
    '~': true,
    '>': true,
    '<': true,
    '=': true
  },
  ANY: {
    '': true,
    '~': true,
    '~>': true,
    '^': true,
    '*': true,
    x: true,
    X: true,
    '>=0.0.0': true
  },
  NULLSET: {
    '<0.0.0-0': true
  }
}

const cache = {}

class Range {
  constructor (range) {
    // return if it's already an instance of Range
    if (range instanceof Range) {
      return range
    }

    // check length
    if (range.length > MAX_LENGTH) {
      throw new TypeError(`Range exceeds ${MAX_LENGTH} characters: ${range.length}`)
    }

    // parse & filter out empty ranges
    this.set = this.raw
      .split('||')
      // map the range to a 2d array of comparators
      .map(r => this.parseRange(r.trim()))
      // throw out any comparator lists that are empty
      .filter(c => c.length)

    if (!this.set.length) {
      throw new TypeError(`Invalid Version Range: ${this.raw}`)
    }

    // if we have any that are not the null set, throw out null sets.
    if (this.set.length > 1) {
      // keep the first one, in case they're all null sets
      const first = this.set[0]
      this.set = this.set.filter(c => !LOOKUP.NULLSET[c[0].value])
      if (this.set.length === 0) {
        this.set = [first]
      } else if (this.set.length > 1) {
        // if we have any that are *, then the range is just *
        for (const c of this.set) {
          if (c.length === 1 && LOOKUP.ANY[c[0].value]) {
            this.set = [c]
            break
          }
        }
      }
    }
    this.format()
  }

  format () {
    this.range = this.set
      .map((comps) => comps.join(' ').trim())
      .join('||')
      .trim()
    return this.range
  }

  toString () {
    return this.range
  }

  parseRange (range) {
    const key = range
    const cached = cache[key]
    if (cached) {
      return cached
    }

    const TOKENS = range.split(/\s+/)
    TOKENS.forEach((token, i) => {
      if (LOOKUP.GRAMMAR[token] && LOOKUP.GRAMMAR[TOKENS[i + 1]] === false) {
        throw new TypeError(`Invalid range - spaces between grammars: ${range}`)
      }
    })

    // if any comparators are the null set, then replace with JUST null set
    // if more than one comparator, remove any * comparators
    // also, don't include the same comparator more than once
    const rangeMap = new Map()
    for (let i = 0; i < range.length; i++) {
      if (LOOKUP.NULLSET[range[i]]) {
        return [range[i]]
      }
      rangeMap.set(range[i])
    }

    if (rangeMap.size > 1 && rangeMap.has('')) {
      rangeMap.delete('')
    }

    const result = [...rangeMap.values()]
    cache[key] = result
    return result
  }

  intersects (range) {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) => {
      return (
        isSatisfiable(thisComparators) &&
        range.set.some((rangeComparators) => {
          return (
            isSatisfiable(rangeComparators) &&
            thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator)
              })
            })
          )
        })
      )
    })
  }

  // if ANY of the sets match ALL of its comparators, then pass
  test (version) {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      try {
        version = new Version(version)
      } catch (er) {
        return false
      }
    }

    for (let i = 0; i < this.set.length; i++) {
      if (testSet(this.set[i], version)) {
        return true
      }
    }
    return false
  }
}

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = (comparators) => {
  let result = true
  const remainingComparators = comparators.slice()
  let testComparator = remainingComparators.pop()

  while (result && remainingComparators.length) {
    result = remainingComparators.every((otherComparator) => {
      return testComparator.intersects(otherComparator)
    })

    testComparator = remainingComparators.pop()
  }

  return result
}

const testSet = (set, version) => {
  for (let i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }
  if (version.prerelease.length) {
    for (let i = 0; i < set.length; i++) {
      if (set[i].semver === Comparator.ANY) {
        continue
      }
      if (set[i].semver.prerelease.length > 0) {
        const allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }
    return false
  }

  return true
}

const maxSatisfying = (versions, range, options) => {
  let max = null
  let maxSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) === -1) {
        // compare(max, v, true)
        max = v
        maxSV = new Version(max, options)
      }
    }
  })
  return max
}

const minSatisfying = (versions, range, options) => {
  let min = null
  let minSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new Version(min, options)
      }
    }
  })
  return min
}

export {
  Range,
  maxSatisfying,
  minSatisfying
}
