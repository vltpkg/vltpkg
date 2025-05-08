import { isError, isObject } from '@vltpkg/types'

/**
 * The root error from an unknown value.
 */
export type RootError = {
  name: string
  message: string
  code?: string
  cause: Record<string, unknown>
  stack?: string
}

/**
 * An error with a parsed cause.
 */
export type ParsedError = Error & { cause: Record<string, unknown> }

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
  let cause: Record<string, unknown> | undefined = undefined
  let next: Error | null = null

  if (isObject(ogCause)) {
    if (isError(ogCause.cause)) next = ogCause.cause
    cause = ogCause
  } else if (isError(ogCause)) {
    next = ogCause
  }

  const err = v as ParsedError
  err.cause = {
    // Get enumerable properties from the error since that is common for core NodeJS errors
    ...Object.fromEntries(Object.entries(v)),
    // Prefer values from the cause object over the enumerable properties
    ...cause,
  }

  return [err, next]
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
export const parseErrorChain = (
  v: unknown,
): [null, null] | [RootError, ParsedError[]] => {
  let root: Error | null = null
  let code: string | undefined = undefined
  const cause: Record<string, unknown> = {}
  const chain: ParsedError[] = []

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
      chain.push(error)
    }

    if (!code && typeof error.cause.code === 'string') {
      code = error.cause.code
    }

    // Only add properties that don't already exist
    for (const [key, value] of Object.entries(error.cause)) {
      // Skip code if it is the same as the root error code
      if (key === 'code' && value === code) {
        continue
      }
      if (!(key in cause)) {
        cause[key] = value
      }
    }
  }

  if (!root) {
    return [null, null]
  }

  return [
    {
      name: root.name,
      message: root.message,
      code,
      cause,
      stack: trimStack(root.stack, root.name, root.message),
    },
    chain,
  ]
}

/**
 * Find the root error from an unknown value, optionally matching a code.
 */
export const findRootError = (
  v: unknown,
  match?: { code?: string },
): RootError | null => {
  const root = parseErrorChain(v)[0]
  return match?.code && root?.code !== match.code ? null : root
}

/**
 * Find the root error from an unknown value and throw if one is not found.
 */
export const asRootError = (
  v: unknown,
  match?: { code?: string },
): RootError => {
  const root = findRootError(v, match)
  if (!root) throw v
  return root
}
