import { isErrorWithCode } from '@vltpkg/error-cause'
import type { ErrorWithCode } from '@vltpkg/error-cause'
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

export const indent = (lines: string, num = 2) =>
  lines
    .split('\n')
    .map(l => ' '.repeat(num) + l)
    .join('\n')

const isErrorWithProps = (
  value: unknown,
): value is Error & Record<string, unknown> =>
  value instanceof Error && Object.keys(value).length > 0

export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  baseOpts?: ErrorFormatOptions,
) => {
  const format: Formatter = (arg: unknown, opts) => {
    const { maxLines = 200, ...rest } = { ...baseOpts, ...opts }
    const lines = formatWithOptions(rest, arg).split('\n')
    const totalLines = lines.length
    if (totalLines > maxLines) {
      lines.length = maxLines
      lines.push(`... ${totalLines - maxLines} lines hidden ...`)
    }
    return lines.join('\n')
  }

  // This is an error with a cause, check if it we know about its
  // code and try to print it. If it did not print then fallback
  // to the next option.
  if (isErrorWithCode(err) && print(err, usage, stderr, format)) {
    return
  }

  // We have a real but we dont know anything special about its
  // properties. Just print the standard error properties as best we can.
  if (err instanceof Error) {
    stderr(`${err.name}: ${err.message}`)
    if ('cause' in err) {
      stderr(`Cause:`)
      if (err.cause instanceof Error) {
        stderr(indent(format(err.cause)))
      } else if (err.cause && typeof err.cause === 'object') {
        for (const key in err.cause) {
          stderr(
            indent(
              `${key}: ${format((err.cause as Record<string, unknown>)[key])}`,
            ),
          )
        }
      } else {
        stderr(indent(format(err.cause)))
      }
    }
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
  err: ErrorWithCode,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  format: Formatter,
) => {
  switch (err.cause.code) {
    case 'EUSAGE': {
      const { found, validOptions } = err.cause
      stderr(usage().usage())
      stderr(`Usage Error: ${err.message}`)
      if (found) {
        stderr(indent(`Found: ${format(found)}`))
      }
      if (validOptions) {
        stderr(
          indent(`Valid options: ${format(validOptions.join(', '))}`),
        )
      }
      return true
    }

    case 'ERESOLVE': {
      const { url, from, response, spec } = err.cause
      stderr(`Resolve Error: ${err.message}`)
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
      return true
    }

    case 'EREQUEST': {
      const { url, method } = err.cause
      const { code, syscall } =
        isErrorWithProps(err.cause.cause) ?
          err.cause.cause
        : ({} as Record<string, unknown>)
      stderr(`Request Error: ${err.message}`)
      if (code) {
        stderr(indent(`Code: ${format(code)}`))
      }
      if (syscall) {
        stderr(indent(`Syscall: ${format(syscall)}`))
      }
      if (url) {
        stderr(indent(`URL: ${url}`))
      }
      if (method) {
        stderr(indent(`Method: ${format(method)}`))
      }

      return true
    }

    case 'ECONFIG': {
      const { found, wanted, validOptions } = err.cause
      stderr(`Config Error: ${err.message}`)
      if (found) {
        stderr(indent(`Found: ${format(found)}`))
      }
      if (wanted) {
        stderr(indent(`Wanted: ${format(wanted)}`))
      }
      if (validOptions) {
        stderr(indent(`Valid Options: ${format(validOptions)}`))
      }
      return true
    }
  }
}
