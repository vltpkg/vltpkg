import { error } from '@vltpkg/error-cause'
import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import type { PostcssNode } from '@vltpkg/dss-parser'

/**
 * The source text of a selector node. Parsed nodes hold references to
 * their parents, so they can never be used as an error `found` value:
 * printing one dumps the entire circular selector tree.
 */
export const selectorText = (node: PostcssNode): string => {
  // parsed nodes stringify back to their source. anything else (a
  // hand-built node in a test, say) only has its value to go on.
  const text =
    node.toString === Object.prototype.toString ?
      ''
      // postcss escapes characters it does not expect in a value, e.g.
      // the leading `.` of `.dev`, which parses as an escaped tag.
    : String(node).trim().replace(/\\(.)/g, '$1')
  return text || (node.value ?? node.type)
}

/**
 * A query syntax error, carrying the offending selector as a string and
 * an `EQUERY` code so the CLI can print it as a usage problem instead
 * of an internal failure.
 */
export const queryError = (
  message: string,
  node: PostcssNode,
  extra?: Pick<ErrorCauseOptions, 'wanted' | 'validOptions'>,
) =>
  error(message, {
    code: 'EQUERY',
    found: selectorText(node),
    ...extra,
  })

/**
 * Number of single-character edits between two strings, capped at
 * `max` so a long list of candidates stays cheap to scan.
 */
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      /* c8 ignore next 5 -- indexes are always in range here */
      const d = Math.min(
        (row[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      )
      row.push(d)
      if (d < best) best = d
    }
    if (best > max) return max + 1
    prev = row
  }
  /* c8 ignore next -- the loop always fills the last cell */
  return prev[b.length] ?? max + 1
}

/**
 * Candidates that are a typo away from `value`, closest first.
 */
export const didYouMean = (
  value: string,
  candidates: Iterable<string>,
  max = 2,
): string[] =>
  [...candidates]
    .map(c => [c, distance(value, c, max)] as const)
    .filter(([, d]) => d <= max)
    .sort(([a, x], [b, y]) => x - y || a.localeCompare(b, 'en'))
    .map(([c]) => c)
