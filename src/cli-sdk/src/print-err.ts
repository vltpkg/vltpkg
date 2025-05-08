import { parseErrorChain } from '@vltpkg/output/error'
import type { RootError } from '@vltpkg/output/error'
import type { CommandUsage } from './index.ts'
import type { InspectOptions } from 'node:util'
import { formatWithOptions } from 'node:util'

export type ErrorFormatOptions = InspectOptions & {
  maxLines?: number
}

export type Formatter = (
  arg: unknown,
  options?: ErrorFormatOptions,
) => string

const formatURL = (v: unknown, format: Formatter) =>
  v instanceof URL ? v.toString() : /* c8 ignore next */ format(v)

const formatArray = (v: unknown, format: Formatter, joiner = ', ') =>
  Array.isArray(v) ? v.join(joiner) : /* c8 ignore next */ format(v)

export const indent = (lines: string, num = 2) =>
  lines
    .split('\n')
    .map(l => ' '.repeat(num) + l)
    .join('\n')

export const printErr = (
  e: unknown,
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

  const [err, causes] = parseErrorChain(e)

  if (!err) {
    // We don't know what this is, just print it.
    stderr(`Unknown Error:`, format(e))
    return
  }

  // This is an error with a cause, check if it we know about its
  // code and try to print it. If it did not print then fallback
  // to the next option.
  if (printCode(err, usage, stderr, format)) {
    return
  }

  // We have a real but we dont know anything special about its
  // properties. Just print the standard error properties as best we can.
  stderr(`${err.name}: ${err.message}`)
  if (err.code) {
    stderr(indent(`Code: ${format(err.code)}`))
  }
  for (const key in err.cause) {
    stderr(indent(`${key}: ${format(err.cause[key])}`))
  }
  if (causes.length) {
    stderr(`Cause:`)
    for (const err of causes) {
      stderr(indent(`${err.name}: ${err.message}`))
    }
  }
  if (err.stack) {
    stderr(`Stack:`)
    stderr(indent(format(err.stack)))
  }
}

const printCode = (
  err: RootError,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  format: Formatter,
) => {
  switch (err.code) {
    case 'EUSAGE': {
      const { found, validOptions } = err.cause
      stderr(usage().usage())
      stderr(`Usage Error: ${err.message}`)
      if (found) {
        stderr(indent(`Found: ${format(found)}`))
      }
      if (validOptions) {
        stderr(
          indent(
            `Valid options: ${formatArray(validOptions, format)}`,
          ),
        )
      }
      return true
    }

    case 'ERESOLVE': {
      const { url, from, response, spec } = err.cause
      stderr(`Resolve Error: ${err.message}`)
      if (url) {
        stderr(indent(`While fetching: ${formatURL(url, format)}`))
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
      const { url, method, syscall, code } = err.cause
      stderr(`Request Error: ${err.message}`)
      if (code) {
        stderr(indent(`Code: ${format(code)}`))
      }
      if (syscall) {
        stderr(indent(`Syscall: ${format(syscall)}`))
      }
      if (url) {
        stderr(indent(`URL: ${formatURL(url, format)}`))
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
