import {
  type ErrorWithCauseObject,
  isErrorRoot,
} from '@vltpkg/error-cause'
import { type CommandUsage } from './index.ts'
import { type Spec } from '@vltpkg/spec'

// returns true if error was printed nicely already
export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: unknown[]) => void,
) => {
  if (!isErrorRoot(err)) {
    // TODO: print _something_ here, but we're in weird broken territory
    // don't just dump it and flood the terminal, though, maybe sniff for code
    // message, stack, etc?
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
