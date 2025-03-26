import { isErrorRoot } from '@vltpkg/error-cause'
import type { ErrorWithCauseObject } from '@vltpkg/error-cause'
import type { CommandUsage } from './index.ts'
import type { InspectOptions } from 'node:util'
import { formatWithOptions } from 'node:util'

export type ErrorFormatOptions = InspectOptions & {
  maxLines?: number
}

type Formatter = (
  arg: unknown,
  options?: ErrorFormatOptions & { indent?: number },
) => string

const parseErrorStack = (err: Error) => {
  if (err.stack) {
    const lines = err.stack.trim().split('\n')
    if (lines[0] === `${err.name}: ${err.message}`) {
      lines.shift()
    }
    return lines.join('\n')
  }
}

const omit = <T extends object>(obj: T, ...keys: string[]): T => {
  const entries = Object.entries(obj).filter(
    ([key]) => !keys.includes(key),
  )
  return Object.fromEntries(entries) as T
}

export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  baseOpts?: ErrorFormatOptions,
) => {
  const format: Formatter = (arg: unknown, options) => {
    const {
      maxLines = 200,
      indent,
      ...rest
    } = {
      ...baseOpts,
      ...options,
    }
    const lines = formatWithOptions(rest, arg).split('\n')
    const totalLines = lines.length
    if (totalLines > maxLines) {
      lines.length = maxLines
      lines.push(`... ${totalLines - maxLines} lines hidden ...`)
    }
    return (
      indent && lines.length > 1 ?
        lines.map(l => ' '.repeat(indent) + l)
      : lines).join('\n')
  }

  // This is an error thrown by us with an error cause object
  // that we can use to print a more informative error message.
  if (isErrorRoot(err)) {
    return print(err, usage, stderr, format)
  }

  // We have an error but it's not one we know about.
  // Just print it as best we can.
  if (err instanceof Error) {
    stderr(`Unknown ${err.name}: ${err.message}`)
    const stack = parseErrorStack(err)
    if (stack) {
      stderr(`  Stack:`)
      stderr(format(stack, { indent: 4 }))
    }
    return
  }

  // We don't know what this is, just print it.
  stderr(`Unknown Error:`, format(err))
}

const print = (
  err: ErrorWithCauseObject,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  format: Formatter,
) => {
  const { cause, message, name } = err
  const { code } = cause

  switch (code) {
    case 'EUSAGE': {
      const { found, validOptions } = cause
      stderr(usage().usage())
      stderr(`Usage Error: ${message}`)
      if (found) {
        stderr(`  Found:`, format(found, { indent: 2 }))
      }
      if (validOptions) {
        stderr(`  Valid options: ${validOptions.join(', ')}`)
      }
      return
    }

    case 'ERESOLVE': {
      const { url, from, response, spec } = cause
      stderr(`Resolve Error: ${message}`)
      if (url) {
        stderr(`  While fetching: ${url}`)
      }
      if (spec) {
        stderr(`  To satisfy:`, format(spec, { indent: 2 }))
      }
      if (from) {
        stderr(`  From: ${from}`)
      }
      if (response) {
        stderr('  Response:', format(response, { indent: 2 }))
      }
      return
    }

    // If we have not written a formatter for this error code yet,
    // do our best to print some relevant information from it for
    // debugging without showing too much since the cause could
    // be nested and large.
    default: {
      stderr(`${name}: ${message}`)
      if (code) {
        stderr(`  Code: ${code}`)
      }
      stderr(`  Cause:`, format(omit(cause, 'code'), { indent: 2 }))
      const stack = parseErrorStack(err)
      if (stack) {
        stderr(`  Stack:`)
        stderr(format(stack, { indent: 4 }))
      }
      return
    }
  }
}
