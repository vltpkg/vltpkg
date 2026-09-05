import type { OptionsChange } from './types.ts'

/**
 * Replaces the userinfo of a URL value with `***`. These messages end up
 * in CI logs, and a registry alias can carry a token.
 */
const redactUserinfo = (value: string) => {
  if (!URL.canParse(value)) return value
  const url = new URL(value)
  if (!url.username && !url.password) return value
  url.username = ''
  url.password = ''
  return url.href.replace('://', '://***@')
}

/**
 * Renders an {@link OptionsChange} as a single diagnostic line.
 */
export const formatOptionsChange = ({
  section,
  key,
  from,
  to,
}: OptionsChange) =>
  `${section}:${key === undefined ? '' : ` ${key}`} ` +
  (from === undefined ? '(missing)' : `"${redactUserinfo(from)}"`) +
  ` -> ${to === undefined ? '(removed)' : `"${redactUserinfo(to)}"`}`
