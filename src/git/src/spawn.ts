import { error } from '@vltpkg/error-cause'
import { promiseSpawn } from '@vltpkg/promise-spawn'
import type {
  SpawnResultStderrString,
  SpawnResultStdoutString,
} from '@vltpkg/promise-spawn'
import promiseRetry from 'promise-retry'
import type { WrapOptions } from 'retry'
import type { GitOptions } from './index.ts'
import { makeError } from './make-error.ts'
import { opts as makeOpts } from './opts.ts'
import { which } from './which.ts'

type Result = SpawnResultStderrString & SpawnResultStdoutString

// git, given `timeout` ms. node's own `timeout` kills git, but a helper
// git started (eg `git-remote-https` stuck connecting) keeps the pipes
// open, and the result waits for that helper to give up (minutes): so
// its pipes are closed too, and the helper ends on its own
const run = async (
  gitPath: string,
  args: string[],
  opts: GitOptions,
  timeout?: number,
): Promise<Result> => {
  const p = promiseSpawn(gitPath, args, makeOpts(opts))
  if (!timeout) return await p
  // set by the timer, read once git is gone
  let timedOut = false as boolean
  const timer = setTimeout(() => {
    timedOut = true
    p.process.kill()
    p.process.stdout.destroy()
    p.process.stderr.destroy()
  }, timeout)
  try {
    const result = await p
    if (timedOut) {
      throw error(`git did not finish within ${timeout}ms`, result)
    }
    return result
  } finally {
    clearTimeout(timer)
  }
}

export const spawn = async (
  gitArgs: string[],
  opts: GitOptions = {},
): Promise<Result> => {
  const gitPath = which(opts)

  if (gitPath instanceof Error) {
    throw gitPath
  }

  /* c8 ignore start - undocumented option, only here for tests */
  const args =
    (
      (opts as { allowReplace?: boolean }).allowReplace ||
      gitArgs[0] === '--no-replace-objects'
    ) ?
      gitArgs
    : ['--no-replace-objects', ...gitArgs]
  /* c8 ignore stop */

  const retryOpts: WrapOptions = {
    retries: opts['fetch-retries'] || 3,
    factor: opts['fetch-retry-factor'] || 2,
    maxTimeout: opts['fetch-retry-maxtimeout'] || 60000,
    minTimeout: opts['fetch-retry-mintimeout'] || 1000,
  }
  // a run that timed out is not retried
  const { timeout, ...spawnOpts } = opts
  return promiseRetry(async (retryFn, num) => {
    const result = await run(gitPath, args, spawnOpts, timeout)
    if (result.status || result.signal) {
      const [shouldRetry, gitError] = makeError(result)
      if (!shouldRetry?.(num)) {
        throw gitError
      }
      retryFn(gitError)
    }
    return result
  }, retryOpts)
}
