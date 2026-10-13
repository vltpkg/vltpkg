/** utility types to turn a null/undefined/void return into string */
export type NullToString<T> = VoidReplace<T>

/** Utility type to replace null/undefined with a given type */
export type NullReplace<T, R = string> =
  T extends NonNullable<T> ? T : NonNullable<T> | R

/** Utility type to replace void with a given type */
export type VoidReplace<T, R = string> =
  undefined extends T ? NullReplace<Exclude<T, void>, R> | R
  : NullReplace<T, R>

// A `limit` of 2 or 3 with no `onPart` is the "split off a prefix" case
// (`a b` => [a, b], `M.m.p-rest` => [M, m, p-rest]). These build the
// result as a fixed-shape array literal, which V8 allocates exactly
// sized, where the generic loop's push-grown array starts with a 17-slot
// backing store: that allocation is most of the cost for such short
// results. They are separate functions on purpose: adding this code
// inline pushes fastSplit past V8's bytecode budget for inlining it into
// callers (~460 bytes), which made the generic path ~30% slower.
const splitTwo = (str: string, delim: string): string[] => {
  const a = str.indexOf(delim)
  return a === -1 ?
      [str]
    : [str.substring(0, a), str.substring(a + delim.length)]
}

const splitThree = (str: string, delim: string): string[] => {
  const a = str.indexOf(delim)
  if (a === -1) return [str]
  const l = delim.length
  const b = str.indexOf(delim, a + l)
  return b === -1 ?
      [str.substring(0, a), str.substring(a + l)]
    : [
        str.substring(0, a),
        str.substring(a + l, b),
        str.substring(b + l),
      ]
}

/**
 * Split a string by a string delimiter, optionally limiting the number
 * of parts parsed, and/or transforming the string parts into some other
 * type of value.
 *
 * Pass `-1` as the `limit` parameter to get all parts (useful if an `onPart`
 * method is provided)
 *
 * If an `onPart` method is provided, and returns `undefined`, then the
 * original string part is included in the result set.
 *
 * ```ts
 * import { fastSplit } from '@vltpkg/fast-split'
 *
 * // say we want to split a string on '.' characters
 * const str = getSomeStringSomehow()
 *
 * // basic usage, just like str.split('.'), gives us an array
 * const parts = fastSplit(str, '.')
 *
 * // get just the first two parts, leave the rest intact
 * // Note: unlike str.split('.', 3), the 'rest' here will
 * // include the entire rest of the string.
 * // If you do `str.split('.', 3)`, then the last item in the
 * // returned array is truncated at the next delimiter
 * const [first, second, rest] = fastSplit(str, '.', 3)
 *
 * // If you need to transform it, say if it's an IPv4 address
 * // that you want to turn into numbers, you can do that by
 * // providing the onPart method, which will be slightly faster
 * // than getting an array and subsequently looping over it
 * // pass `-1` as the limit to give us all parts
 * const nums = fastSplit(str, '.', -1, (part, parts, index) => Number(part))
 * ```
 */
export function fastSplit<T = string>(
  str: string,
  delim: string,
  limit: number,
  onPart: (part: string, parts: NullToString<T>[], i: number) => T,
): NullToString<T>[]
export function fastSplit(
  str: string,
  delim: string,
  limit?: number,
): string[]
export function fastSplit<T = string>(
  str: string,
  delim: string,
  limit = -1,
  onPart?: (
    part: string,
    parts: NullToString<T>[],
    i: number,
  ) => T | undefined,
): NullToString<T>[] {
  if (onPart === undefined) {
    if (limit === 2) return splitTwo(str, delim) as NullToString<T>[]
    if (limit === 3)
      return splitThree(str, delim) as NullToString<T>[]
  }
  let i = 0
  let p = 0
  const l = delim.length
  const parts: NullToString<T>[] = []
  while (i !== -1) {
    i = str.indexOf(delim, p)
    const part =
      i === -1 || parts.length === limit - 1 ?
        str.substring(p)
      : str.substring(p, i)
    parts.push((onPart?.(part, parts, i) ?? part) as NullToString<T>)
    if (parts.length === limit) {
      // push the rest into the last part
      return parts
    }
    p = i + l
  }
  return parts
}
