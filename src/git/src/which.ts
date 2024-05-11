import { error } from '@vltpkg/error-cause'
import { whichSync } from '@vltpkg/which'
import { type GitOptions } from './index.js'

let gitPath: string | undefined = undefined

export const which = (opts: GitOptions = {}) => {
  if (opts.git) {
    return opts.git
  }
  let whichError: Error | undefined = undefined
  if (opts.git !== false) {
    if (!gitPath) {
      try {
        gitPath = whichSync('git')
      } catch (er) {
        whichError = er as Error
      }
    }
  }
  if (!gitPath || opts.git === false) {
    return error(
      'No git binary found in $PATH',
      {
        code: 'ENOGIT',
        cause: whichError,
      },
      which,
    )
  }
  return gitPath
}
