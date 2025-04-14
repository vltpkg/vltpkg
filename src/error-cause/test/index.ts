import {
  error,
  syntaxError,
  typeError,
  asError,
  isErrorWithCause,
  isErrorWithCode,
} from '../src/index.ts'
import type { Codes } from '../src/index.ts'
import t from 'tap'

t.test('error types', async t => {
  t.equal(error('x').name, 'Error')
  t.equal(typeError('x').name, 'TypeError')
  t.equal(syntaxError('x').name, 'SyntaxError')
})

t.test('setting causes', async t => {
  t.test('object', async t => {
    const cause = { status: 1 }
    const er = error('status is one', cause)
    t.strictSame(er.cause, cause)
  })

  t.test('error', async t => {
    const cause = new Error('foo')
    const er = error('msg', cause)
    t.strictSame(er.cause, cause)
  })

  t.test('error try/catch', async t => {
    let cause: unknown = null
    try {
      throw new Error('foo')
    } catch (er) {
      cause = er
    }
    const er = error('msg', { cause })
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

t.test('isErrorWithCode type guard', async t => {
  t.equal(
    isErrorWithCode(error('with code', { code: 'EINTEGRITY' })),
    true,
  )
  t.equal(isErrorWithCode(new Error('plain')), false)
  t.equal(
    isErrorWithCode(error('with cause', new Error('inner cause'))),
    false,
  )
  t.equal(
    isErrorWithCode(error('with cause obj', { path: '/tmp' })),
    false,
  )
  t.equal(
    isErrorWithCode(
      error('with invalid code', {
        code: 'THIS_IS_NOT_A_VALID_CODE' as Codes,
      }),
    ),
    false,
  )
  t.equal(
    isErrorWithCode(
      error('with non-string code', { code: 123 as any }),
    ),
    false,
  )
  t.equal(
    isErrorWithCode(error('with null code', { code: null as any })),
    false,
  )
  t.equal(isErrorWithCode({ cause: { code: 'ENOENT' } }), false)
  t.equal(isErrorWithCode(null), false)
  t.equal(isErrorWithCode(undefined), false)
  t.equal(isErrorWithCode('a string'), false)
  t.equal(isErrorWithCode(123), false)
})
