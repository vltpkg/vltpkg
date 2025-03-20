import t from 'tap'
import { merge } from '../../src/config/merge.ts'

t.strictSame(merge({ array: [1, 2, 3] }, { array: [2, 4, 3] }), {
  array: [1, 2, 3, 4],
})

t.strictSame(merge({ a: { foo: 'bar' } }, { a: { bar: 'baz' } }), {
  a: { foo: 'bar', bar: 'baz' },
})

t.strictSame(merge({ a: { foo: 'bar' } }, { a: true }), { a: true })

t.strictSame(merge({ a: { foo: 'bar' } }, { a: ['bar', 'baz'] }), {
  a: ['bar', 'baz'],
})

t.strictSame(merge({ a: ['bar', 'baz'] }, { a: { foo: 'bar' } }), {
  a: { foo: 'bar' },
})
