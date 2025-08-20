import type {
  SpawnResultStderr,
  SpawnResultString,
} from '@vltpkg/promise-spawn'

import { error } from '@vltpkg/error-cause'

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
  result: SpawnResultStderr & SpawnResultString,
): [null | ((n: number) => boolean), Error] =>
  connectionErrorRe.test(result.stderr) ?
    [
      (n: number) => n < 3,
      error('A git connection error occurred', result),
    ]
  : missingPathspecRe.test(result.stderr) ?
    [null, error('The git reference could not be found', result)]
  : [null, error('An unknown git error occurred', result)]
