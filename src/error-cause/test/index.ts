import { error, syntaxError, typeError } from '../src/index.js'
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
