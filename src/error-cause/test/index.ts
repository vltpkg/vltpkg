import { error, syntaxError, typeError } from '../src/index.ts'
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
