// TODO: it might be faster to not have Version objects in the
// comparator tuples, and instead just keep the parsed number arrays?
import { syntaxError } from '@vltpkg/error-cause'
import { fastSplit } from './fast-split.js'
import { Version } from './version.js'

/** all comparators are expressed in terms of these operators */
export type SimpleOperator = '>' | '<' | '>=' | '<=' | ''
/** operators that are expanded to simpler forms */
export type ComplexOperator = '~' | '^' | '~>'

const isOperator = (
  o?: string,
): o is SimpleOperator | ComplexOperator =>
  !!o &&
  (o === '>' ||
    o === '<' ||
    o === '>=' ||
    o === '<=' ||
    o === '' ||
    o === '~' ||
    o === '^' ||
    o === '~>')

/** comparator expressed as a [operator,version] tuple */
export type OVTuple = [SimpleOperator, Version]

const preJunk = new Set('=v \t')

const invalidComp = (c: string, message: string): SyntaxError =>
  syntaxError(
    `invalid comparator: '${c}' ${message}`,
    { found: c },
    Comparator,
  )

const assertNumber = (value: string, c: string, field: string) => {
  const n = Number(value)
  if (n !== n) {
    throw invalidComp(
      c,
      `${field} must be numeric or 'x', got: '${value}'`,
    )
  }
  return n
}

const assertVersion = (v: string, comp: string) => {
  if (!v) {
    throw invalidComp(comp, 'no value provided for operator')
  }
}

const assertMissing = (
  value: string | undefined,
  c: string,
  field: string,
) => {
  if (value && !isX(value)) {
    throw invalidComp(
      c,
      `cannot omit '${field}' and include subsequent fields`,
    )
  }
}

const MAJOR = 0
const MINOR = 1
const PATCH = 2

const isX = (c?: string) => !c || c === 'X' || c === 'x' || c === '*'

/**
 * The result of parsing a version value that might be either a full
 * version like `1.2.3` or an X-Range like `1.2.x`
 */
export type ParsedXRange =
  | ParsedXMajor
  | ParsedXMinor
  | ParsedXPatch
  | ParsedXVersion
/**
 * a {@link ParsedXRange} that is just a `*`
 */
export type ParsedXMajor = []
/**
 * a {@link ParsedXRange} that is just a major version
 */
export type ParsedXMinor = [number]
/**
 * a {@link ParsedXRange} that is just a major and minor version
 */
export type ParsedXPatch = [number, number]
/**
 * a {@link ParsedXRange} that is a full version
 */
export type ParsedXVersion = [
  M: number,
  m: number,
  p: number,
  pr?: string | undefined,
  b?: string | undefined,
]

const isFullVersion = (
  parsed: ParsedXRange,
): parsed is ParsedXVersion => undefined !== parsed[PATCH]
const isXPatch = (parsed: ParsedXRange): parsed is ParsedXPatch =>
  undefined !== parsed[MINOR] && undefined === parsed[PATCH]
const isXMinor = (parsed: ParsedXRange): parsed is ParsedXMinor =>
  undefined !== parsed[MAJOR] && undefined === parsed[MINOR]
const isXMajor = (parsed: ParsedXRange): parsed is ParsedXMajor =>
  undefined === parsed[MAJOR]

/**
 * Class used to parse the `||` separated portions
 * of a range, and evaluate versions against it.
 *
 * This does most of the heavy lifting of range testing, and provides
 * little affordance for improperly formatted strings. It should be
 * considered an internal class, and usually not accessed directly.
 *
 * @internal
 */
export class Comparator {
  /**
   * does this range include prereleases, even when they do not
   * match the tuple in the comparator?
   */
  includePrerelease: boolean
  /** raw string used to create this comparator */
  raw: string
  /** tokens extracted from the raw string input */
  tokens: string[]
  /**
   * Either the `any` comparator, the `none` comparator, or an operator
   * and a {@link ParsedXRange}
   */
  tuples: (OVTuple | Comparator)[] = []
  /** true if this comparator can not match anything */
  isNone = false
  /**
   * true if this comparator is a `'*'` type of range.
   *
   * Note that it still will not match versions with a prerelease value,
   * unless the tuple in the version matches the tuple provided to the
   * comparator, and the comparator version also has a prerelease value,
   * unless `includePrerelease` is set.
   */
  isAny = false

  /** the canonical strict simplified parsed form of this constructor */
  toString() {
    return (
      this.isNone ? '<0.0.0-0'
      : this.isAny ? '*'
      : /* c8 ignore next */
        this.tuples.map(c => (isAny(c) ? '*' : c.join(''))).join(' ')
    )
  }

  constructor(comp: string, includePrerelease = false) {
    this.includePrerelease = includePrerelease
    comp = comp.trim()
    this.raw = comp
    let hyphen = false
    const rawComps = fastSplit(comp, ' ', -1, (part, parts, i) => {
      if (part === '-') {
        if (hyphen) {
          throw invalidComp(
            comp,
            'multiple hyphen ranges not allowed',
          )
        }
        if (parts.length !== 1 || i === -1) {
          throw invalidComp(
            comp,
            'hyphen must be between two versions',
          )
        }
        hyphen = true
      } else if (hyphen && parts.length !== 2) {
        throw invalidComp(comp, 'hyphen range must be alone')
      }
    })

    // remove excess spaces, `> 1   2` => `>1 2`
    const comps: string[] = []
    let followingOperator = false
    for (let i = 0; i < rawComps.length; i++) {
      const c = rawComps[i]!
      if (c === '') continue
      if (!followingOperator) {
        followingOperator = isOperator(c)
        comps.push(c)
        continue
      }
      ;(comps[comps.length - 1]!) += c
      followingOperator = false
    }

    // defense in depth for TS, already guaranteed
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hyphen) {
      const [min, _, max] = comps
      /* c8 ignore start - defense in depth for TS, already guaranteed */
      if (!min || !max) {
        throw invalidComp(comp, 'hyphen must be between two versions')
      }
      /* c8 ignore stop */
      this.#parseHyphenRange(min, max)
    } else if (
      !comps.length ||
      (comps.length === 1 && isX(comps[0]))
    ) {
      this.tuples.push(this.#getComparatorAny())
    } else {
      for (const c of comps) {
        this.#parse(c)
        if (this.isNone) break
      }
    }
    this.tokens = comps
    this.isAny = true
    for (const c of this.tuples) {
      if (Array.isArray(c) || !c.isAny) {
        this.isAny = false
        break
      }
    }
  }

  // inclusive min
  #xInclusiveMin(raw: string): OVTuple | Comparator {
    const z = this.includePrerelease ? '0' : undefined
    const [M, m = 0, p = 0, pr = z, build] = this.#parseX(raw)
    return M === undefined ?
        this.#getComparatorAny()
      : ['>=', new Version(raw, M, m, p, pr, build)]
  }

  // exclusive min.
  // Note, if not a full version, then
  #xExclusiveMin(raw: string): OVTuple | Comparator {
    const parsed = this.#parseX(raw)
    if (isFullVersion(parsed)) {
      return ['>', new Version(raw, ...parsed)]
    }
    const z = this.includePrerelease ? '0' : undefined
    if (isXPatch(parsed)) {
      // >1.2 => >=1.3.0
      return [
        '>=',
        new Version(
          raw,
          parsed[MAJOR],
          parsed[MINOR] + 1,
          0,
          z,
          undefined,
        ),
      ]
    }
    if (isXMinor(parsed)) {
      // >1 => >=2.0.0
      return [
        '>=',
        new Version(raw, parsed[MAJOR] + 1, 0, 0, z, undefined),
      ]
    }
    this.isNone = true
    this.tuples.length = 0
    return comparatorNone
  }

  #xInclusiveMax(raw: string): OVTuple | Comparator {
    const parsed = this.#parseX(raw)
    if (isFullVersion(parsed)) {
      return ['<=', new Version(raw, ...parsed)]
    }
    if (isXPatch(parsed)) {
      return [
        '<',
        new Version(
          raw,
          parsed[MAJOR],
          parsed[MINOR] + 1,
          0,
          '0',
          undefined,
        ),
      ]
    }
    if (isXMinor(parsed)) {
      return [
        '<',
        new Version(raw, parsed[MAJOR] + 1, 0, 0, '0', undefined),
      ]
    }
    return this.#getComparatorAny()
  }

  #xExclusiveMax(raw: string): OVTuple | Comparator {
    const z = this.includePrerelease ? '0' : undefined
    const [M = 0, m = 0, p = 0, pr = z, build] = this.#parseX(raw)
    if (M === 0 && m === 0 && p === 0 && pr === '0') {
      this.isNone = true
      this.tuples.length = 0
      return comparatorNone
    }
    return ['<', new Version(raw, M, m, p, pr, build)]
  }

  // pull the relevant values out of an X-range or version
  // return the fields for creating a Version object.
  // only call once operator is stripped off
  #parseX(raw: string): ParsedXRange {
    let [M, m, p] = fastSplit(raw, '.', 3)
    let prune = 0
    while (M && preJunk.has(M.charAt(prune))) prune++
    if (M !== undefined && prune !== 0) M = M.substring(prune)
    // the `|| !M` is so TS knows we've handled undefined
    if (isX(M) || !M) {
      assertMissing(m, raw, 'major')
      assertMissing(p, raw, 'major')
      if (m === '' || p === '') {
        throw invalidComp(raw, `(Did you mean '*'?)`)
      }
      return []
    }
    if (isX(m) || !m) {
      assertMissing(p, raw, 'major')
      if (m === '' || p === '') {
        throw invalidComp(raw, `(Did you mean '${M}'?)`)
      }
      return [assertNumber(M, raw, 'major')]
    }
    if (isX(p) || !p) {
      if (p === '') {
        throw invalidComp(raw, `(Did you mean '${M}.${m}'?)`)
      }
      return [
        assertNumber(M, raw, 'major'),
        assertNumber(m, raw, 'minor'),
      ]
    }
    const hy = p.indexOf('-')
    const pl = p.indexOf('+')
    if (pl === -1 && hy === -1) {
      return [
        assertNumber(M, raw, 'major'),
        assertNumber(m, raw, 'minor'),
        assertNumber(p, raw, 'patch'),
      ]
    }
    if (hy === -1) {
      // build, no prerelease
      const [patch, build] = fastSplit(p, '+', 2)
      if (!patch) {
        throw invalidComp(raw, 'cannot specify build without patch')
      }
      if (!build) {
        throw invalidComp(raw, `encountered '+', but no build value`)
      }
      return [
        assertNumber(M, raw, 'major'),
        assertNumber(m, raw, 'minor'),
        assertNumber(patch, raw, 'patch'),
        undefined,
        build,
      ]
    }
    if (pl === -1) {
      // prerelease, no build
      const [patch, pr] = fastSplit(p, '-', 2)
      if (!patch) {
        throw invalidComp(
          raw,
          'cannot specify prerelease without patch',
        )
      }
      if (!pr) {
        throw invalidComp(
          raw,
          `encountered '-', but no prerelease value`,
        )
      }
      return [
        assertNumber(M, raw, 'major'),
        assertNumber(m, raw, 'minor'),
        assertNumber(patch, raw, 'patch'),
        pr,
      ]
    }
    // both prerelease and build
    const [patch, trailers = ''] = fastSplit(p, '-', 2)
    if (!patch) {
      throw invalidComp(
        raw,
        'cannot specify prerelease without patch',
      )
    }
    const [pr, build] = fastSplit(trailers, '+', 2)
    if (!pr) {
      throw invalidComp(
        raw,
        `encountered '-', but no prerelease value`,
      )
    }
    if (!build) {
      throw invalidComp(raw, `encountered '+', but no build value`)
    }
    return [
      assertNumber(M, raw, 'major'),
      assertNumber(m, raw, 'minor'),
      assertNumber(patch, raw, 'patch'),
      pr,
      build,
    ]
  }

  #parseHyphenRange(min: string, max: string) {
    const minv = this.#xInclusiveMin(min)
    const maxv = this.#xInclusiveMax(max)
    const minAny = isAny(minv)
    const maxAny = isAny(maxv)
    return (
      minAny && maxAny ? this.tuples.push(this.#getComparatorAny())
      : maxAny ? this.tuples.push(minv)
      : minAny ? this.tuples.push(maxv)
      : this.tuples.push(minv, maxv)
    )
  }

  #parse(comp: string) {
    const first = comp.charAt(0)
    const first2 = comp.substring(0, 2)
    const v1 = comp.substring(1)
    const v2 = comp.substring(2)
    switch (first2) {
      case '~>':
        assertVersion(v2, comp)
        return this.#parseTilde(v2)
      case '>=':
        assertVersion(v2, comp)
        return this.tuples.push(this.#xInclusiveMin(v2))
      case '<=':
        assertVersion(v2, comp)
        return this.tuples.push(
          this.#xInclusiveMax(comp.substring(2)),
        )
    }
    switch (first) {
      case '~':
        assertVersion(v1, comp)
        return this.#parseTilde(v1)
      case '^':
        assertVersion(v1, comp)
        return this.#parseCaret(v1)
      case '>':
        assertVersion(v1, comp)
        return this.tuples.push(
          this.#xExclusiveMin(comp.substring(1)),
        )
      case '<':
        assertVersion(v1, comp)
        return this.tuples.push(
          this.#xExclusiveMax(comp.substring(1)),
        )
    }
    return this.#parseEq(comp)
  }

  #parseTilde(comp: string) {
    const parsed = this.#parseX(comp)
    if (isXMajor(parsed)) {
      this.tuples.push(this.#getComparatorAny())
      return
    }
    const z = this.includePrerelease ? '0' : undefined
    if (isXMinor(parsed)) {
      const [M] = parsed
      this.tuples.push(
        ['>=', new Version(comp, M, 0, 0, z, undefined)],
        ['<', new Version(comp, M + 1, 0, 0, '0', undefined)],
      )
      return
    }
    if (isXPatch(parsed)) {
      const [M, m] = parsed
      const z = this.includePrerelease ? '0' : undefined
      this.tuples.push(
        ['>=', new Version(comp, M, m, 0, z, undefined)],
        ['<', new Version(comp, M, m + 1, 0, '0', undefined)],
      )
      return
    }
    const [M, m, p, pr = z, build] = parsed
    this.tuples.push(
      ['>=', new Version(comp, M, m, p, pr, build)],
      ['<', new Version(comp, M, m + 1, 0, '0', build)],
    )
  }

  #parseCaret(comp: string) {
    const min = this.#xInclusiveMin(comp)
    if (isAny(min)) {
      this.tuples.push(min)
      return
    }
    const minv = min[1]
    if (minv.major !== 0) {
      this.tuples.push(min, [
        '<',
        new Version(comp, minv.major + 1, 0, 0, '0', undefined),
      ])
    } else if (minv.minor !== 0) {
      this.tuples.push(min, [
        '<',
        new Version(
          comp,
          minv.major,
          minv.minor + 1,
          0,
          '0',
          undefined,
        ),
      ])
    } else if (!minv.prerelease?.length) {
      this.tuples.push(['', minv])
    } else {
      this.tuples.push(min, [
        '<',
        new Version(
          comp,
          minv.major,
          minv.minor,
          minv.patch + 1,
          '0',
          undefined,
        ),
      ])
    }
  }

  #parseEq(comp: string) {
    const parsed = this.#parseX(comp)
    const z = this.includePrerelease ? '0' : undefined
    if (isXMajor(parsed)) {
      this.tuples.push(this.#getComparatorAny())
    } else if (isFullVersion(parsed)) {
      this.tuples.push(['', new Version(comp, ...parsed)])
    } else if (isXMinor(parsed)) {
      this.tuples.push(
        ['>=', new Version(comp, parsed[MAJOR], 0, 0, z, undefined)],
        [
          '<',
          new Version(comp, parsed[MAJOR] + 1, 0, 0, '0', undefined),
        ],
      )
    } else if (isXPatch(parsed)) {
      this.tuples.push(
        [
          '>=',
          new Version(
            comp,
            parsed[MAJOR],
            parsed[MINOR],
            0,
            z,
            undefined,
          ),
        ],
        [
          '<',
          new Version(
            comp,
            parsed[MAJOR],
            parsed[MINOR] + 1,
            0,
            '0',
            undefined,
          ),
        ],
      )
    }
  }

  /** return true if the version is a match for this comparator */
  test(v: Version) {
    if (this.isNone) return false
    const ip = this.includePrerelease
    const hasPR = !!v.prerelease?.length
    let prOK = ip || !hasPR
    for (const c of this.tuples) {
      if (isAny(c)) {
        continue
      }
      const [op, cv] = c
      prOK ||= !!cv.prerelease?.length && v.tupleEquals(cv)
      switch (op) {
        case '':
          if (!v.equals(cv)) return false
          continue
        case '>':
          if (!v.greaterThan(cv)) return false
          continue
        case '>=':
          if (!v.greaterThanEqual(cv)) return false
          continue
        case '<':
          if (!v.lessThan(cv)) return false
          continue
        case '<=':
          if (!v.lessThanEqual(cv)) return false
          continue
      }
    }
    // they all passed, so it can only fail for having a prerelease
    // if we allow prereleases, or saw a matching tuple, that's ok.
    return prOK
  }

  #getComparatorAny() {
    return this.includePrerelease ? comparatorAnyPR : comparatorAny
  }
}

const isAny = (c: OVTuple | Comparator): c is Comparator =>
  c === comparatorAny || c === comparatorAnyPR
const comparatorAny = {
  isAny: true,
  toString: () => '*',
  includePrerelease: false,
  test: (v: Version) => !v.prerelease?.length,
} as Comparator
const comparatorAnyPR = {
  isAny: true,
  toString: () => '*',
  includePrerelease: true,
  test: (_: Version) => true,
} as Comparator
const comparatorNone = {
  isNone: true,
  toString: () => '<0.0.0-0',
  includePrerelease: false,
  test: (_: Version) => false,
} as unknown as Comparator
