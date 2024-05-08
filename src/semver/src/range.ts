import { Comparator } from './comparator.js'
import { fastSplit } from './fast-split.js'
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

  /** true if the range cannot match anything */

  /**
   * set of {@link Comparator} objects representing the `||`-separated sections
   * of the range. If at least one of these matches, then the version is a
   * match.
   */
  set: Comparator[] = []

  /** true if all prerelease versions should be included */
  includePrerelease: boolean

  constructor(range: string, includePrerelease: boolean = false) {
    this.raw = range
    this.includePrerelease = includePrerelease
    fastSplit(range, '||', -1, part =>
      this.set.push(new Comparator(part, this.includePrerelease)),
    )
    this.isAny = this.set.some(c => c.isAny)
  }

  /**
   * test a {@link Version} against the range
   */
  test(v: Version) {
    return this.set.some(c => c.test(v))
  }

  /** return the simplified canonical form of this range */
  toString() {
    return this.set.map(c => String(c)).join(' || ')
  }
}
