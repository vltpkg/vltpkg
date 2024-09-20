import { fastSplit } from '@vltpkg/fast-split'
import { Comparator } from './comparator.js'
import { Version } from './version.js'

/**
 * A representation of a semver range, used to test versions.
 *
 * Includes a set of comparators representing the `||`-separated
 * sections of the range string
 */
export class Range {
  /** raw string used to create this Range */
  raw: string

  /** true if the range is `*` */
  isAny: boolean

  /** true if the range is a single semver version */
  isSingle: boolean

  /** true if the range cannot match anything */

  /**
   * set of {@link Comparator} objects representing the `||`-separated sections
   * of the range. If at least one of these matches, then the version is a
   * match.
   */
  set: Comparator[] = []

  /** true if all prerelease versions should be included */
  includePrerelease: boolean

  /** cached toString */
  #toString?: string

  constructor(range: string, includePrerelease = false) {
    this.raw = range
    this.includePrerelease = includePrerelease
    fastSplit(range, '||', -1, part =>
      this.set.push(new Comparator(part, this.includePrerelease)),
    )
    this.isAny = this.set.some(c => c.isAny)

    const cmp = this.set[0]
    this.isSingle =
      this.set.length === 1 &&
      !!cmp &&
      Array.isArray(cmp.tuples) &&
      cmp.tuples.length === 1 &&
      Array.isArray(cmp.tuples[0]) &&
      cmp.tuples[0][0] === ''

    if (this.isSingle) {
      this.#toString = String(cmp)
    }
  }

  /**
   * test a {@link Version} against the range
   */
  test(v: Version) {
    return this.set.some(c => c.test(v))
  }

  /** return the simplified canonical form of this range */
  toString() {
    if (this.#toString) return this.#toString
    this.#toString = this.set.map(c => String(c)).join(' || ')
    return this.#toString
  }
}
