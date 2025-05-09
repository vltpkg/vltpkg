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
export type ParsedResult = [
  ParsedError,
  ParsedError['cause'],
  ParsedError[],
]

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
  let root: ParsedError | null = null
  let code: string | undefined = undefined
  const cause: ParsedError['cause'] = {}
  const causes: ParsedError[] = []

  let current: unknown = v
  while (current) {
    const [error, next] = parseErrorAndCause(current)
    current = next

    if (!error) {
      continue
    }

    if (!root) {
      root = error
    } else {
      causes.push(error)
    }

    if (!code && typeof error.code === 'string') {
      code = error.code
    }

    for (const [key, value] of Object.entries(error.cause)) {
      // Skip if the code is already set and the value is the same
      if (key === 'code' && value === code) {
        continue
      }
      // Only add properties that don't already exist
      if (!(key in cause)) {
        cause[key] = value
      }
    }
  }

  return !root ? null : [root, cause, causes]
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
      // When just getting the root error, assign the merged cause to the returned
      // error. Use parseErrorChain directly to get the cause on each error.
    : Object.assign(res[0], { cause: res[1] })
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
