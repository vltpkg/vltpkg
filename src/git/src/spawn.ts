import {
  promiseSpawn,
  SpawnResultStderrString,
  SpawnResultStdoutString,
} from '@vltpkg/promise-spawn'
import promiseRetry from 'promise-retry'
import { GitOptions } from './index.js'
import { makeError } from './make-error.js'
import { opts as makeOpts } from './opts.js'
import { which } from './which.js'

export const spawn = async (
  gitArgs: string[],
  opts: GitOptions = {},
): Promise<SpawnResultStdoutString & SpawnResultStderrString> => {
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

  let retryOpts = opts.retry
  if (retryOpts === null || retryOpts === undefined) {
    retryOpts = {
      retries: opts.fetchRetries || 2,
      factor: opts.fetchRetryFactor || 10,
      maxTimeout: opts.fetchRetryMaxtimeout || 60000,
      minTimeout: opts.fetchRetryMintimeout || 1000,
    }
  }
  return promiseRetry(async (retryFn, num) => {
    const result = await promiseSpawn(gitPath, args, makeOpts(opts))
    if (result.status || result.signal) {
      const gitError = makeError(result)
      if (!gitError.shouldRetry(num)) {
        throw gitError
      }
      retryFn(gitError)
    }
    return result
  }, retryOpts)
}
