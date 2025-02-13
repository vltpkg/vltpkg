import t from 'tap'
import { UnpackRequest } from '../src/unpack-request.ts'

t.test('rejects', async t => {
  t.plan(2)
  const a = new UnpackRequest(Buffer.from('aaaa'), './a')
  t.equal(a.id, 1)
  void t.rejects(a.promise, new Error('reason'))
  a.reject(new Error('reason'))
})

t.test('resolves', async t => {
  t.plan(2)
  const b = new UnpackRequest(Buffer.from('bbbb'), './b')
  t.equal(b.id, 2)
  void t.resolves(b.promise)
  b.resolve()
})
