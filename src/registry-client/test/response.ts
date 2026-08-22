import { EventEmitter } from 'node:events'
import t from 'tap'
import { CacheEntry } from '../src/cache-entry.ts'
import { collectHeaders, readBody } from '../src/response.ts'

t.test('collectHeaders', t => {
  const h = collectHeaders({
    headers: {
      a: '1',
      b: ['2', '3'],
      c: undefined,
    },
  } as never)
  t.strictSame(
    h.map(v => Buffer.from(v).toString()),
    ['a', '1', 'b', '2, 3'],
  )
  t.end()
})

t.test('readBody', async t => {
  const body = new EventEmitter()
  const entry = new CacheEntry(200, [])
  const p = readBody({ body } as never, entry)
  body.emit('data', Buffer.from('ab'))
  body.emit('data', Buffer.from('c'))
  body.emit('end')
  t.equal((await p).text(), 'abc')

  const errBody = new EventEmitter()
  const errP = readBody(
    { body: errBody } as never,
    new CacheEntry(200, []),
  )
  errBody.emit('error', new Error('boom'))
  await t.rejects(errP, { message: 'boom' })
})
