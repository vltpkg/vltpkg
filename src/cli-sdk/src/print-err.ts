import { isErrorRoot } from '@vltpkg/error-cause'
import type { ErrorWithCauseObject } from '@vltpkg/error-cause'
import type { CommandUsage } from './index.ts'
import type { Spec } from '@vltpkg/spec'

// returns true if error was printed nicely already
export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: unknown[]) => void,
) => {
  if (!isErrorRoot(err)) {
    // generic error handling, any errors without a cause will stop here
    const msg = (err as { message: string }).message
    if (msg) {
      stderr(`Error: ${msg}`)
    }
    return
  }
  if (isErrorRoot(err) && print(err, usage, stderr)) return
  stderr(err)
}

const print = (
  err: ErrorWithCauseObject,
  usage: CommandUsage,
  stderr: (...a: unknown[]) => void,
): boolean => {
  switch (err.cause.code) {
    case 'EUSAGE': {
      stderr(usage().usage())
      stderr(`Error: ${err.message}`)
      if (err.cause.found) {
        stderr(`  Found: ${err.cause.found}`)
      }
      if (err.cause.validOptions) {
        stderr(
          `  Valid options: ${err.cause.validOptions.join(', ')}`,
        )
      }
      return true
    }

    case 'ERESOLVE': {
      stderr(`Resolve Error: ${err.message}`)
      const { url, from, response, spec } = err.cause
      if (url) {
        stderr(`  While fetching: ${url}`)
      }
      if (spec) {
        stderr(`  To satisfy: ${spec as string | Spec}`)
      }
      if (from) {
        stderr(`  From: ${from}`)
      }
      if (response) {
        stderr('Response:', response)
      }
      return true
    }
  }

  return false
}
