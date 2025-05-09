import { isError, isObject } from '@vltpkg/types'

/**
 * An error with a parsed cause.
 */
export type ParsedError = {
  name: string
  message: string
  code?: string
  cause: Record<string, unknown>
  stack?: string
}

/**
 * The root error from an unknown value.
 */
export type ParsedResult = [ParsedError, ParsedError[]]

/**
 * Get the error, cause, and next error in the chain from an unknown value.
 */
export const parseErrorAndCause = (
  v: unknown,
): [null, null] | [ParsedError, Error | null] => {
  if (!isError(v)) {
    return [null, null]
  }

  const ogCause = v.cause
  let cause: ParsedError['cause'] | undefined = undefined
  let next: Error | null = null

  if (isObject(ogCause)) {
    if (isError(ogCause.cause)) {
      next = ogCause.cause
      delete ogCause.cause
    }
    cause = ogCause
  } else if (isError(ogCause)) {
    next = ogCause
  }

  const errCause: ParsedError['cause'] = {
    // Get enumerable properties from the error since that is common for core NodeJS errors
    ...Object.fromEntries(Object.entries(v)),
    // Prefer values from the cause object over the enumerable properties
    ...cause,
  }
  return [
    {
      name: v.name,
      message: v.message,
      code:
        typeof errCause.code === 'string' ? errCause.code : undefined,
      cause: errCause,
      stack: trimStack(v.stack, v.name, v.message),
    },
    next,
  ]
}

/**
 * Helper util to trim the stack trace from an error.
 */
export const trimStack = (
  stack: string | undefined,
  name: string,
  message: string,
) => {
  if (stack) {
    const lines = stack.trim().split('\n')
    if (lines[0] === `${name}: ${message}`) {
      lines.shift()
    }
    return lines.map(l => l.trim()).join('\n')
  }
}

/**
 * Parse an unknown value into a root error and the rest of the chain of parsed
 * errors.
 */
export const parseErrorChain = (v: unknown): null | ParsedResult => {
  const causes: ParsedError[] = []

  let current: unknown = v
  while (current) {
    const [error, next] = parseErrorAndCause(current)
    current = next

    if (!error) {
      continue
    }

    causes.push(error)
  }

  const root = causes.shift()

  return !root ? null : [root, causes]
}

/**
 * Find the root error from an unknown value, optionally matching a code.
 */
export const findRootError = (
  v: unknown,
  match?: { code?: string },
): ParsedError | null => {
  const res = parseErrorChain(v)
  return !res || (match?.code && res[0].code !== match.code) ?
      null
    : res[0]
}

/**
 * Find the root error from an unknown value and throw if one is not found.
 */
export const asRootError = (
  v: unknown,
  match?: { code?: string },
): ParsedError => {
  const err = findRootError(v, match)
  if (!err) throw v
  return err
}
