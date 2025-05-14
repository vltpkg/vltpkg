import { isError, isObject } from '@vltpkg/types'

export type ErrorCause = Record<string, unknown> & {
  cause?: ErrorCause
}

export type ParsedError = {
  name: string
  message: string
  stack?: string
  cause?: ErrorCause | ParsedError
  [key: string]: unknown
}

/**
 * Parse an unknown value into an error. Will also take enumerable properties
 * from legacy style Node errors and treat them as the cause.
 */
export const parseError = (err: unknown): null | ParsedError => {
  if (!isError(err)) {
    return null
  }

  // Assume that if the error has enumerable properties, then
  // it is a legacy error and does not also have a cause.
  const enumerable = Object.fromEntries(Object.entries(err))
  if (Object.keys(enumerable).length) {
    err.cause = enumerable
    return err as ParsedError
  }

  if (isObject(err.cause)) {
    if (isError(err.cause.cause)) {
      err.cause.cause = parseError(err.cause.cause)
    }
  } else if (isError(err.cause)) {
    err.cause = parseError(err.cause)
  }

  return err as ParsedError
}

/**
 * Find the root error from an unknown value, optionally matching a code.
 */
export const findRootError = (
  v: unknown,
  match?: { code?: string },
): ParsedError | null => {
  const err = parseError(v)
  return !err || (match?.code && err.cause?.code !== match.code) ?
      null
    : err
}

/**
 * Find the root error from an unknown value and throw if one is not found.
 */
export const asRootError = (
  v: unknown,
  match?: { code?: string },
): Omit<ParsedError, 'cause'> &
  Required<Pick<ParsedError, 'cause'>> => {
  const err = findRootError(v, match)
  if (!err) throw v
  err.cause = err.cause ?? {}
  return err as Omit<ParsedError, 'cause'> &
    Required<Pick<ParsedError, 'cause'>>
}
