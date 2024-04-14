import t from 'tap'
import { UnpackRequest } from '../dist/esm/unpack-request.js'

const a = new UnpackRequest(Buffer.from('aaaa'), './a')
const b = new UnpackRequest(Buffer.from('bbbb'), './b')

t.equal(a.id, 1)
t.equal(b.id, 2)

t.rejects(a.promise, new Error('reason'))
t.resolves(b.promise)
a.reject(new Error('reason'))
b.resolve()
