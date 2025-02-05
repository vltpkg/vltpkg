import t from 'tap'
import { UnpackRequest } from '../dist/esm/unpack-request.js'

t.test('basic', async t => {
  const a = new UnpackRequest(Buffer.from('aaaa'), './a')
  const b = new UnpackRequest(Buffer.from('bbbb'), './b')

  t.equal(a.id, 1)
  t.equal(b.id, 2)

  await t.rejects(a.promise, new Error('reason'))
  await t.resolves(b.promise)
  a.reject(new Error('reason'))
  b.resolve()
})
