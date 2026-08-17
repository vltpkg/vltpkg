/**
 * Rendering untrusted strings to a terminal.
 *
 * Advisory data reaches us from a third-party feed, and package names
 * and versions come from tarballs. None of it is trustworthy, and all
 * of it ends up on a terminal, where control bytes are instructions
 * rather than characters. `node:util`'s `stripVTControlCharacters` is
 * not enough on its own: it removes well-formed escape sequences but
 * leaves a bare `ESC`, `BEL`, `\r` and `\n` intact -- which are exactly
 * the bytes needed to terminate an OSC 8 hyperlink early and start
 * writing arbitrary sequences, to overwrite an already-printed line, or
 * to forge a whole line of output such as a reassuring summary.
 */

/**
 * C0 controls, DEL, and C1 controls, plus the zero-width and
 * bidirectional-override characters that let text render in an order
 * other than the one it is stored in.
 *
 * Written as escapes and compiled at load, so the pattern itself
 * contains no control bytes.
 */
const unsafePattern =
  '[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069]'
const unsafe = new RegExp(unsafePattern)
const unsafeGlobal = new RegExp(unsafePattern, 'g')

/**
 * Default ceiling on a single rendered value. Advisory titles and
 * descriptions are unbounded upstream, so without a cap one entry can
 * flood the report.
 */
export const maxTextLength = 512

/**
 * A string safe to write to a terminal: no control bytes, no
 * bidirectional overrides, and length-capped.
 *
 * Non-strings render as empty rather than `[object Object]`, so a
 * malformed feed value can't masquerade as content.
 *
 * The common case is a string that needs no changes, so this tests
 * before rewriting and returns the original when it is already clean --
 * one scan, no allocation.
 */
export const safeText = (
  value: unknown,
  maxLength: number = maxTextLength,
): string => {
  if (typeof value !== 'string') {
    return typeof value === 'number' || typeof value === 'bigint' ?
        String(value)
      : ''
  }
  // cap first so the rewrite below is bounded by maxLength, not by
  // however much the feed decided to send
  const capped =
    value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
  return unsafe.test(capped) ?
      capped.replace(unsafeGlobal, '')
    : capped
}

/**
 * A URL safe to put behind a terminal hyperlink, or undefined.
 *
 * Only `http` and `https` survive. A terminal that supports OSC 8 hands
 * the target to the OS opener, so any other scheme -- `javascript:`,
 * `file://`, an application handler -- turns a printed advisory id into
 * a click that does something the reader cannot see beforehand.
 */
export const safeUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const cleaned = safeText(value, 2048)
  let parsed: URL
  try {
    parsed = new URL(cleaned)
  } catch {
    return undefined
  }
  return parsed.protocol === 'https:' || parsed.protocol === 'http:' ?
      parsed.href
    : undefined
}
