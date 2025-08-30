import t from 'tap'
import { setRawHeader } from '../src/set-raw-header.ts'

const h: Uint8Array[] = []

setRawHeader(h, 'x', 'y')
t.strictSame(h, [Buffer.from([120]), Buffer.from([121])]) // 'x', 'y'
setRawHeader(h, 'x', 'x')
t.strictSame(h, [Buffer.from([120]), Buffer.from([120])]) // 'x', 'x'
setRawHeader(h, 'asdf', new Uint8Array([102, 111, 111])) // 'foo'

t.strictSame(h, [
  Buffer.from([120]), // 'x'
  Buffer.from([120]), // 'x'
  Buffer.from([97, 115, 100, 102]), // 'asdf'
  new Uint8Array([102, 111, 111]), // 'foo'
])
