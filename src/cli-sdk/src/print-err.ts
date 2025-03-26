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
  options?: ErrorFormatOptions,
) => string

const trimStack = (err: Error) => {
  if (err.stack) {
    const lines = err.stack.trim().split('\n')
    if (lines[0] === `${err.name}: ${err.message}`) {
      lines.shift()
    }
    return lines.map(l => l.trim()).join('\n')
  }
}

const omit = <T extends object>(obj: T, ...keys: string[]): T => {
  const entries = Object.entries(obj).filter(
    ([key]) => !keys.includes(key),
  )
  return Object.fromEntries(entries) as T
}

const indent = (lines: string, num = 2) =>
  lines
    .split('\n')
    .map(l => ' '.repeat(num) + l)
    .join('\n')

export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  baseOpts?: ErrorFormatOptions,
) => {
  const format: Formatter = (arg: unknown, options) => {
    const { maxLines = 200, ...rest } = {
      ...baseOpts,
      ...options,
    }
    const lines = formatWithOptions(rest, arg).split('\n')
    const totalLines = lines.length
    if (totalLines > maxLines) {
      lines.length = maxLines
      lines.push(`... ${totalLines - maxLines} lines hidden ...`)
    }
    return lines.join('\n')
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
    const stack = trimStack(err)
    if (stack) {
      stderr(`Stack:`)
      stderr(indent(format(stack)))
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
        stderr(indent(`Found: ${format(found)}`))
      }
      if (validOptions) {
        stderr(
          indent(`Valid options: ${format(validOptions.join(', '))}`),
        )
      }
      return
    }

    case 'ERESOLVE': {
      const { url, from, response, spec } = cause
      stderr(`Resolve Error: ${message}`)
      if (url) {
        stderr(indent(`While fetching: ${url}`))
      }
      if (spec) {
        stderr(indent(`To satisfy: ${format(spec)}`))
      }
      if (from) {
        stderr(indent(`From: ${format(from)}`))
      }
      if (response) {
        stderr(indent(`Response: ${format(response)}`))
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
        stderr(indent(`Code: ${code}`))
      }
      stderr(indent(`Cause: ${format(omit(cause, 'code'))}`))
      const stack = trimStack(err)
      if (stack) {
        stderr(`Stack:`)
        stderr(indent(format(stack)))
      }
      return
    }
  }
}
