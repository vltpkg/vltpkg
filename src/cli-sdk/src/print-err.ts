import { parseError } from '@vltpkg/output/error'
import type { ParsedError } from '@vltpkg/output/error'
import type { CommandUsage } from './index.ts'
import type { InspectOptions } from 'node:util'
import { formatWithOptions } from 'node:util'
import { XDG } from '@vltpkg/xdg'
import { join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

export const formatOptions = {
  depth: Infinity,
  maxArrayLength: Infinity,
  maxStringLength: Infinity,
} as const satisfies InspectOptions

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

const writeErrorLog = (e: unknown, format: Formatter) => {
  try {
    const dir = new XDG('vlt/error-logs').data()
    const file = join(dir, `error-${process.pid}.log`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      file,
      format(e, {
        colors: false,
        maxLines: Infinity,
      }),
    )
    return file
  } catch {
    return null
  }
}

export const printErr = (
  e: unknown,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  baseOpts?: ErrorFormatOptions,
) => {
  const format: Formatter = (arg: unknown, opts) => {
    const { maxLines = 200, ...rest } = {
      ...formatOptions,
      ...baseOpts,
      ...opts,
    }
    const lines = formatWithOptions(rest, arg).split('\n')
    const totalLines = lines.length
    if (totalLines > maxLines) {
      lines.length = maxLines
      lines.push(`... ${totalLines - maxLines} lines hidden ...`)
    }
    return lines.join('\n')
  }

  const err = parseError(e)
  const knownError = printCode(err, usage, stderr, format)
  const fileWritten =
    !knownError || knownError.file ? writeErrorLog(e, format) : null

  // We could not write an error log and its not a know error,
  // so we print the entire formatted value.
  if (!fileWritten && !knownError) {
    return stderr(format(e))
  }

  if (err && !knownError) {
    stderr(`${err.name}: ${err.message}`)
  }
  if (fileWritten) {
    stderr('')
    stderr(`Full details written to: ${fileWritten}`)
  }
  if (!knownError || knownError.bug) {
    stderr('')
    stderr('Open an issue with the full error details at:')
    stderr(indent('https://github.com/vltpkg/vltpkg/issues/new'))
  }
}

const printCode = (
  err: ParsedError | null,
  usage: CommandUsage,
  stderr: (...a: string[]) => void,
  format: Formatter,
): void | { bug?: boolean; file?: boolean } => {
  if (!err) return

  switch (err.cause?.code) {
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
      return {}
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
      return { file: true }
    }

    case 'EREQUEST': {
      const { url, method } = err.cause
      const { code, syscall } = err.cause.cause ?? {}
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
      return { file: true }
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
      return {}
    }
  }
}
