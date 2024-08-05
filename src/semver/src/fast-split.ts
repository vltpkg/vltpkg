/**
 * This is about 10% faster for splitting short strings by a short delimiter.
 * When we have to walk the resulting list for any reason, or limit the number
 * of items returned, it's an even bigger difference.
 *
 * 2024 M1 macbook pro, using node 20.11.0, v8 version 11.3.244.8-node.17
 * Counts are operations per ms, splitting the string '1.2.3-asdf+foo' by the
 * delimiter '.', transforms calling part.toUpperCase(), and limits at 2 items
 *
 *               split 10385.779
 *           fastSplit 10718.341
 *     splitEmptyCheck  9563.721
 * fastSplitEmptyCheck 11273.537
 *  splitTransformLoop  5722.724
 *   splitTransformMap  6136.161
 *  fastSplitTransform  6438.606
 *          splitLimit  7076.179
 *      fastSplitLimit 13257.948
 */

// utility types to turn a null/undefined/void return into string
export type NullToString<T> = VoidReplace<T>

export type NullReplace<T, R = string> =
  T extends NonNullable<T> ? T : NonNullable<T> | R

export type VoidReplace<T, R = string> =
  void extends T ? NullReplace<Exclude<T, void>, R> | R
  : NullReplace<T, R>

// overloaded so we can infer the return type.
// if the onPart fn returns undefined, return the original string.
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
  limit: number = -1,
  onPart?: (
    part: string,
    parts: NullToString<T>[],
    i: number,
  ) => T | undefined,
): NullToString<T>[] {
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
