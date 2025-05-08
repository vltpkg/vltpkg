import {
  error,
  syntaxError,
  typeError,
  asError,
  isErrorWithCause,
  isObject,
  findRootError,
  parseErrorChain,
  asRootError,
} from '../src/index.ts'
import type { ErrorCauseOptions } from '../src/index.ts'
import t from 'tap'

t.test('error types', async t => {
  t.equal(error('x').name, 'Error')
  t.equal(typeError('x').name, 'TypeError')
  t.equal(syntaxError('x').name, 'SyntaxError')
})

t.test('setting causes', async t => {
  t.test('object', async t => {
    const typeCause = (_: ErrorCauseOptions) => {}
    const cause = { status: 1 }
    const er = error('status is one', cause)
    typeCause(er.cause)
    t.strictSame(er.cause, cause)
  })

  t.test('error', async t => {
    const typeCause = (_: Error) => {}
    const cause = new Error('foo')
    const er = error('msg', cause)
    typeCause(er.cause)
    t.strictSame(er.cause, cause)
  })

  t.test('missing cause', async t => {
    const typeCause = (_: unknown) => {}
    const er = error('msg')
    typeCause(er.cause)
    t.equal(er.cause, undefined)
  })

  t.test('error try/catch', async t => {
    const typeCause = (_: ErrorCauseOptions) => {}
    let cause: unknown = null
    try {
      throw new Error('foo')
    } catch (er) {
      cause = er
    }
    const er = error('msg', { cause })
    typeCause(er.cause)
    t.strictSame(er.cause, { cause })
  })
})

t.test('invalid causes cause TS errors', t => {
  //@ts-expect-error
  error('x', 'y')
  //@ts-expect-error
  error('x', { code: 1 })
  //@ts-expect-error
  error('x', { code: 123 })
  //@ts-expect-error
  error('x', { code: 'E_I_AM_SO_CREATIVE' })
  //@ts-expect-error
  error('x', { status: true })
  //@ts-expect-error
  error('x', { version: true })
  //@ts-expect-error
  error('x', { range: true })
  t.pass('typechecks passed')
  t.end()
})

t.test('stack pruning', t => {
  const foo = () => bar()
  const bar = () => baz()
  const baz = () => asdf()
  const asdf = () => {
    return error('x', undefined, bar)
  }
  t.match(foo().stack, /Error: x\n {4}at foo/)
  t.end()
})

t.test('asError', t => {
  t.ok(asError(new Error('')) instanceof Error)
  t.ok(asError(null) instanceof Error)
  t.ok(asError('').message === 'Unknown error')
  t.end()
})

t.test('isErrorWithCause type guard', async t => {
  t.equal(isErrorWithCause(new Error('plain')), false)
  t.equal(
    isErrorWithCause(error('with cause', new Error('inner cause'))),
    true,
  )
  t.equal(
    isErrorWithCause(error('with cause obj', { code: 'ENOENT' })),
    true,
  )
  t.equal(isErrorWithCause({ cause: 'something' }), false) // Not an Error instance
  t.equal(isErrorWithCause({ message: 'no cause' }), false)
  t.equal(isErrorWithCause(null), false)
  t.equal(isErrorWithCause(undefined), false)
  t.equal(isErrorWithCause('a string'), false)
  t.equal(isErrorWithCause(123), false)
})

t.test('isObject', async t => {
  t.equal(isObject({}), true)
  t.equal(isObject(null), false)
  t.equal(isObject(undefined), false)
  t.equal(isObject('a string'), false)
  t.equal(isObject(123), false)
})

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
