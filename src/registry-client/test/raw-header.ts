import t from 'tap'
import { getRawHeader, setRawHeader } from '../src/raw-header.ts'

t.strictSame(
  getRawHeader(
    [new Uint8Array([120]), new Uint8Array([121])],
    'asdf',
  ), // 'x', 'y'
  undefined,
)
t.strictSame(
  getRawHeader([new Uint8Array([120]), new Uint8Array([121])], 'x'), // 'x', 'y'
  new Uint8Array([121]), // 'y'
)
t.strictSame(
  getRawHeader([new Uint8Array([120]), new Uint8Array([121])], 'X'), // 'x', 'y'
  new Uint8Array([121]), // 'y'
)
t.strictSame(
  getRawHeader([new Uint8Array([88]), new Uint8Array([121])], 'x'), // 'X', 'y'
  new Uint8Array([121]), // 'y'
)
t.strictSame(
  getRawHeader([new Uint8Array([88]), new Uint8Array([121])], 'X'), // 'X', 'y'
  new Uint8Array([121]), // 'y'
)

const h = [new Uint8Array([120]), new Uint8Array([121])] // 'x', 'y'
t.strictSame(setRawHeader(h, 'x', 'a'), [
  new Uint8Array([120]), // 'x'
  new Uint8Array([97]), // 'a'
])
t.strictSame(setRawHeader(h, 'X', 'b'), [
  new Uint8Array([120]), // 'x'
  new Uint8Array([98]), // 'b'
])
h[0] = new Uint8Array([88]) // 'X'

t.strictSame(setRawHeader(h, 'x', 'c'), [
  new Uint8Array([88]), // 'X'
  new Uint8Array([99]), // 'c'
])

const i = setRawHeader(h, 'X', 'd')
t.strictSame(i, [new Uint8Array([88]), new Uint8Array([100])]) // 'X', 'd'
const j = setRawHeader(i, 'a', 'b')
t.strictSame(j, [
  new Uint8Array([88]), // 'X'
  new Uint8Array([100]), // 'd'
  new Uint8Array([97]), // 'a'
  new Uint8Array([98]), // 'b'
])
const k = setRawHeader(j, 'C', new Uint8Array([100])) // 'd'
t.strictSame(k, [
  new Uint8Array([88]), // 'X'
  new Uint8Array([100]), // 'd'
  new Uint8Array([97]), // 'a'
  new Uint8Array([98]), // 'b'
  new Uint8Array([99]), // 'c'
  new Uint8Array([100]), // 'd'
])
