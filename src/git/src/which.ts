import { whichSync } from '@vltpkg/which'
import { type GitOptions } from './index.js'

let gitPath: string | undefined = undefined

export const which = (opts: GitOptions = {}) => {
  if (opts.git) {
    return opts.git
  }
  if (opts.git !== false) {
    if (!gitPath) {
      try {
        gitPath = whichSync('git')
      } catch {}
    }
  }
  if (!gitPath || opts.git === false) {
    return Object.assign(new Error('No git binary found in $PATH'), {
      code: 'ENOGIT',
    })
  }
  return gitPath
}
