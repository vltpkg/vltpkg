import t from 'tap'
import {
  findRootError,
  asRootError,
  parseError,
} from '../src/error.ts'
import { formatWithOptions } from 'node:util'

const error = (message: string, cause?: unknown) =>
  new Error(message, cause ? { cause } : undefined)

const format = (v: unknown) =>
  formatWithOptions({ depth: Infinity }, v)

t.test('findRootError', async t => {
  t.equal(findRootError('what'), null)
  t.match(findRootError(new Error('plain')), { message: 'plain' })
  t.equal(
    findRootError(new Error('plain'), { code: 'ECONFIG' }),
    null,
  )
  t.match(
    findRootError(error('message', { code: 'ECONFIG', wanted: 'a' })),
    {
      message: 'message',
      cause: {
        code: 'ECONFIG',
        wanted: 'a',
      },
    },
  )
  t.equal(
    findRootError(error('message', { code: 'ECONFIG' }), {
      code: 'ESOMETHINGELSE',
    }),
    null,
  )
  t.match(
    findRootError(
      error('message', {
        code: 'ECONFIG',
        cause: Object.assign(new Error('cause'), {
          code: 'ECONNREFUSED',
          syscall: 'connect',
        }),
      }),
    ),
    {
      message: 'message',
      cause: {
        code: 'ECONFIG',
        cause: {
          code: 'ECONNREFUSED',
          syscall: 'connect',
        },
      },
    },
  )
})

t.test('asRootError', async t => {
  t.throws(() => asRootError('what'))
  t.doesNotThrow(() => asRootError(error('message')))
})

t.test('parseError', async t => {
  const causeErr = error('root error', {
    code: 'EUNKNOWN',
    name: 'root error name',
    cause: error('cause 1', {
      name: 'cause 1 name',
      min: 100,
      cause: error('cause 2', {
        name: 'cause 2 name',
        max: 200,
        cause: error('cause 3', {
          name: 'cause 3 name',
          wanted: 'what',
        }),
      }),
    }),
  })
  t.equal(format(causeErr), format(parseError(causeErr)))

  const nativeErr = new Error('root error', {
    cause: new Error('cause 1', {
      cause: new Error('cause 2', {
        cause: new Error('cause 3', {
          cause: {
            arbitrary: 'thing',
          },
        }),
      }),
    }),
  })
  t.equal(format(nativeErr), format(parseError(nativeErr)))

  t.strictSame(
    parseError(
      Object.assign(new Error('plain'), { arbitrary: 'thing' }),
    )?.cause,
    { arbitrary: 'thing' },
  )

  // make sure we can access deeply nested cause properties
  // without upsetting typescript
  t.strictSame(
    parseError(causeErr)?.cause?.cause?.cause?.cause?.cause?.cause
      ?.cause?.wanted,
    'what',
  )
  t.strictSame(
    parseError(nativeErr)?.cause?.cause?.cause?.cause?.arbitrary,
    'thing',
  )
  t.strictSame(
    // @ts-expect-error -- without parseError, this is not enumerable
    causeErr.cause?.cause?.cause?.cause?.cause?.cause?.cause?.wanted,
    'what',
  )
})
