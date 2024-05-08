import {
  SpawnResultStderr,
  SpawnResultString,
} from '@vltpkg/promise-spawn'
import {
  GitConnectionError,
  GitPathspecError,
  GitUnknownError,
} from './errors.js'

const connectionErrorRe = new RegExp(
  [
    'remote error: Internal Server Error',
    'The remote end hung up unexpectedly',
    'Connection timed out',
    'Operation timed out',
    'Failed to connect to .* Timed out',
    'Connection reset by peer',
    'SSL_ERROR_SYSCALL',
    'The requested URL returned error: 503',
  ].join('|'),
)

const missingPathspecRe =
  /pathspec .* did not match any file\(s\) known to git/

export const makeError = (
  result: SpawnResultString & SpawnResultStderr,
) =>
  Object.assign(
    connectionErrorRe.test(result.stderr) ? new GitConnectionError()
    : missingPathspecRe.test(result.stderr) ? new GitPathspecError()
    : new GitUnknownError(),
    result,
  )
