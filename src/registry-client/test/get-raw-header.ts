import t from 'tap'
import { getRawHeader } from '../src/get-raw-header.js'

t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'asdf'),
  undefined,
)
t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'x'),
  Buffer.from('y'),
)
t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'a'),
  undefined,
)
