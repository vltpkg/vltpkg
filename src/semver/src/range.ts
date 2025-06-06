import { fastSplit } from '@vltpkg/fast-split'
import { Comparator } from './comparator.ts'
import type { Version } from './version.ts'
import { asError } from '@vltpkg/types'

export const isRange = (range: unknown): range is Range => {
  return (
    range instanceof Range ||
    (typeof range === 'object' &&
      range !== null &&
      'raw' in range &&
      typeof range.raw === 'string' &&
      'set' in range &&
      Array.isArray(range.set) &&
      range.set.every(c => c instanceof Comparator))
  )
}

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
    this.isAny = false
    let isFirst = true
    this.isSingle = false
    const comparatorErrors: Error[] = []
    fastSplit(range, '||', -1, part => {
      if (this.isAny) return
      const cmp = this.#maybeComparator(part, this.includePrerelease)
      if (cmp instanceof Error) {
        comparatorErrors.push(cmp)
        return
      }
      if (cmp.isAny) {
        this.set = [cmp]
        this.isAny = true
        return
      }
      this.set.push(cmp)
      if (!isFirst) this.isSingle = false
      else if (
        Array.isArray(cmp.tuples) &&
        cmp.tuples.length === 1 &&
        Array.isArray(cmp.tuples[0]) &&
        cmp.tuples[0][0] === ''
      ) {
        this.isSingle = true
      }
      isFirst = false
    })
    if (!this.set.length && comparatorErrors.length) {
      if (comparatorErrors.length === 1 && comparatorErrors[0]) {
        throw comparatorErrors[0]
      }
      throw new AggregateError(comparatorErrors)
    }
  }

  #maybeComparator(part: string, includePrerelease: boolean) {
    try {
      return new Comparator(part, includePrerelease)
    } catch (er) {
      return asError(er)
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
    if (this.isSingle) {
      this.#toString = String(this.set[0])
      return this.#toString
    }
    this.#toString = this.set.map(c => String(c)).join(' || ')
    return this.#toString
  }
}
