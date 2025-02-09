import t from 'tap'
import { isIterable } from '../src/is-iterable.ts'

t.equal(isIterable([]), true)
t.equal(isIterable({}), false)
t.equal(isIterable(Buffer.from('asdf')), true)
// this is weird, but strings are scalars, even though
// they are technically iterable when an object.
t.equal(isIterable('asdf'), false)
t.equal(isIterable(new String('asdf')), true)
