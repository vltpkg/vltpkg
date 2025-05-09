import t from 'tap'
import {
  findRootError,
  asRootError,
  parseErrorChain,
} from '../src/error.ts'

const error = (message: string, cause?: unknown) =>
  new Error(message, cause ? { cause } : undefined)

t.test('findRootError', async t => {
  t.equal(findRootError('what'), null)
  t.match(findRootError(new Error('plain')), {
    message: 'plain',
  })
  t.equal(
    findRootError(new Error('plain'), { code: 'ECONFIG' }),
    null,
  )
  t.match(
    findRootError(error('message', { code: 'ECONFIG', wanted: 'a' })),
    {
      message: 'message',
      code: 'ECONFIG',
      cause: {
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
      code: 'ECONFIG',
      cause: {
        code: 'ECONNREFUSED',
        syscall: 'connect',
      },
    },
  )
  t.match(
    findRootError(
      error('message', {
        wanted: 'a',
        cause: error('cause', {
          wanted: 'b',
          name: 'c',
        }),
      }),
    ),
    {
      message: 'message',
      cause: {
        wanted: 'a',
        name: 'c',
      },
    },
  )
  t.match(
    findRootError(
      error('message', {
        code: 'ECONFIG',
        cause: new Error('cause', {
          cause: new Error('next', {
            cause: { code: 'ECONNREFUSED' },
          }),
        }),
      }),
    ),
    {
      message: 'message',
      code: 'ECONFIG',
      cause: {
        code: 'ECONNREFUSED',
      },
    },
  )
})

t.test('asRootError', async t => {
  t.throws(() => asRootError('what'))
  t.doesNotThrow(() => asRootError(error('message')))
})

t.test('parseErrorChain', async t => {
  const [root, chain] = parseErrorChain(
    error('message', {
      code: 'ECONFIG',
      cause: new Error('a', {
        cause: new Error('b', {
          cause: new Error('c'),
        }),
      }),
    }),
  )
  t.ok(root)
  t.equal(root?.message, 'message')
  t.equal(chain?.length, 3)
  t.equal(chain?.[0]?.message, 'a')
  t.equal(chain?.[1]?.message, 'b')
  t.equal(chain?.[2]?.message, 'c')
})
