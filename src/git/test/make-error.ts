import t from 'tap'
import { makeError as _makeError } from '../src/make-error.ts'

const makeError = (message: string) =>
  // Create the error with properties like it came from promise-spawn
  _makeError({
    stderr: message,
    stdout: '',
    cwd: '',
    command: '',
    args: [],
    status: 0,
    signal: null,
  })

t.test('throw matching error for missing pathspec', t => {
  const missingPathspec = makeError(
    "error: pathspec 'foo' did not match any file(s) known to git",
  )
  t.match(missingPathspec, {
    message: 'The git reference could not be found',
    cause: {
      stderr:
        "error: pathspec 'foo' did not match any file(s) known to git",
    },
  })

  t.end()
})

t.test('only transient connection errors are retried', t => {
  const sslError = makeError('SSL_ERROR_SYSCALL')
  t.ok(sslError.shouldRetry(1), 'transient error, not beyond max')
  t.match(sslError, {
    message: 'A git connection error occurred',
    cause: { stderr: 'SSL_ERROR_SYSCALL' },
  })

  const unknownError = makeError('asdf')
  t.notOk(unknownError.shouldRetry(1), 'unknown error, do not retry')
  t.match(unknownError, {
    message: 'An unknown git error occurred',
    cause: { stderr: 'asdf' },
  })

  const connectError = makeError(
    'Failed to connect to fooblz Timed out',
  )
  t.notOk(
    connectError.shouldRetry(69),
    'beyond max retries, do not retry',
  )
  t.match(connectError, {
    message: 'A git connection error occurred',
    cause: { stderr: 'Failed to connect to fooblz Timed out' },
  })

  t.end()
})
