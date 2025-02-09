import {
  error,
  syntaxError,
  typeError,
  asErrorCause,
  isErrorRoot,
} from '../src/index.ts'
import t from 'tap'

t.test('setting cause', t => {
  const cause = { status: 1 }
  const te = typeError('status is one', cause)
  t.equal(te.cause, cause)
  t.end()
})

t.test('setting cause about syntax', t => {
  const cause = { found: 'x', wanted: /[a-b]/ }
  const te = syntaxError('x is not a or b', cause)
  t.equal(te.cause, cause)
  t.end()
})

t.test('invalid causes cause TS errors', t => {
  //@ts-expect-error
  error('x', 'y')
  //@ts-expect-error
  error('x', { code: 1 })
  //@ts-expect-error
  typeError('x', { code: 123 })
  //@ts-expect-error
  typeError('x', { code: 'E_I_AM_SO_CREATIVE' })
  //@ts-expect-error
  syntaxError('x', { status: true })
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

t.test('asErrorCause', t => {
  const err = new Error('an error')
  t.strictSame(asErrorCause(err), err)
  const errCause = { code: 'ok' }
  t.strictSame(asErrorCause(errCause), errCause)
  t.match(asErrorCause(0), new Error('0'))
  t.match(asErrorCause(false), new Error('false'))
  t.match(asErrorCause(true), new Error('true'))
  const unknownErr = new Error('Unknown error')
  t.match(asErrorCause(''), unknownErr)
  t.match(asErrorCause(null), unknownErr)
  t.match(asErrorCause(undefined), unknownErr)
  t.match(asErrorCause([]), unknownErr)
  t.end()
})

t.test('isErrorRoot', t => {
  t.equal(isErrorRoot(new Error('', { cause: {} })), true)
  t.equal(isErrorRoot(new Error('')), false)
  t.equal(isErrorRoot(new Error('', { cause: null })), false)
  t.end()
})
