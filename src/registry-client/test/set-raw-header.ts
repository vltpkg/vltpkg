import t from 'tap'
import { setRawHeader } from '../src/set-raw-header.ts'

const h: Buffer[] = []

setRawHeader(h, 'x', 'y')
t.strictSame(h, [Buffer.from('x'), Buffer.from('y')])
setRawHeader(h, 'x', 'x')
t.strictSame(h, [Buffer.from('x'), Buffer.from('x')])
setRawHeader(h, 'asdf', Buffer.from('foo'))

t.strictSame(h, [
  Buffer.from('x'),
  Buffer.from('x'),
  Buffer.from('asdf'),
  Buffer.from('foo'),
])
