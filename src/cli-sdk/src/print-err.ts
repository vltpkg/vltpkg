import { isErrorRoot } from '@vltpkg/error-cause'
import type { ErrorWithCauseObject } from '@vltpkg/error-cause'
import type { CommandUsage } from './index.ts'
import type { Spec } from '@vltpkg/spec'

export const printErr = (
  err: unknown,
  usage: CommandUsage,
  stderr: (...a: unknown[]) => void,
) => {
  if (isErrorRoot(err)) {
    return print(err, usage, stderr)
  }
  // We don't know exactly what this is but we need to print something to help
  // us debug unknown unknown errors especially in the compiled/bundled
  // versions. The word "Unknown" is a signal that this is different than the
  // generic handled errors that are printed.
  const msg = err instanceof Error ? err.message : ''
  stderr(`Unknown Error${msg ? `: ${msg}` : ''}`)
}

const print = (
  err: ErrorWithCauseObject,
  usage: CommandUsage,
  stderr: (...a: unknown[]) => void,
) => {
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
      return
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
      return
    }

    default: {
      // We know it is one of our errors but the cause could be large so we
      // don't dump the whole thing to the terminal. Codes should be added as
      // cases above to specifically handle causes that can be really long.
      const code = err.cause.code ? `${err.cause.code} ` : ''
      stderr(`${code}Error: ${err.message}`)
      return
    }
  }
}
