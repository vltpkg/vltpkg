import t from 'tap'
import { setRawHeader } from '../src/set-raw-header.ts'

const h: Uint8Array[] = []

setRawHeader(h, 'x', 'y')
t.strictSame(h, [new Uint8Array([120]), new Uint8Array([121])]) // 'x', 'y'
setRawHeader(h, 'x', 'x')
t.strictSame(h, [new Uint8Array([120]), new Uint8Array([120])]) // 'x', 'x'
setRawHeader(h, 'asdf', new Uint8Array([102, 111, 111])) // 'foo'

t.strictSame(h, [
  new Uint8Array([120]), // 'x'
  new Uint8Array([120]), // 'x'
  new Uint8Array([97, 115, 100, 102]), // 'asdf'
  new Uint8Array([102, 111, 111]), // 'foo'
])
