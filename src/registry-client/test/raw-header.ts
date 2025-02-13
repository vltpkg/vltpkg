import t from 'tap'
import { getRawHeader, setRawHeader } from '../src/raw-header.ts'

t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'asdf'),
  undefined,
)
t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'x'),
  Buffer.from('y'),
)
t.strictSame(
  getRawHeader([Buffer.from('x'), Buffer.from('y')], 'X'),
  Buffer.from('y'),
)
t.strictSame(
  getRawHeader([Buffer.from('X'), Buffer.from('y')], 'x'),
  Buffer.from('y'),
)
t.strictSame(
  getRawHeader([Buffer.from('X'), Buffer.from('y')], 'X'),
  Buffer.from('y'),
)

const h = [Buffer.from('x'), Buffer.from('y')]
t.strictSame(setRawHeader(h, 'x', 'a'), [
  Buffer.from('x'),
  Buffer.from('a'),
])
t.strictSame(setRawHeader(h, 'X', 'b'), [
  Buffer.from('x'),
  Buffer.from('b'),
])
h[0] = Buffer.from('X')

t.strictSame(setRawHeader(h, 'x', 'c'), [
  Buffer.from('X'),
  Buffer.from('c'),
])

const i = setRawHeader(h, 'X', 'd')
t.strictSame(i, [Buffer.from('X'), Buffer.from('d')])
const j = setRawHeader(i, 'a', 'b')
t.strictSame(j, [
  Buffer.from('X'),
  Buffer.from('d'),
  Buffer.from('a'),
  Buffer.from('b'),
])
const k = setRawHeader(j, 'C', Buffer.from('d'))
t.strictSame(k, [
  Buffer.from('X'),
  Buffer.from('d'),
  Buffer.from('a'),
  Buffer.from('b'),
  Buffer.from('c'),
  Buffer.from('d'),
])
