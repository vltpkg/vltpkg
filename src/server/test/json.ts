import EventEmitter from 'node:events'
import type { IncomingMessage, ServerResponse } from 'http'
import t from 'tap'
import * as json from '../src/json.ts'

t.test('read', async t => {
  const fakeRequest = Object.assign(
    new EventEmitter<{
      data: [string]
      end: []
    }>(),
    {
      setEncoding: (enc: BufferEncoding) => t.equal(enc, 'utf8'),
    },
  ) as unknown as IncomingMessage

  const p = json.read<{ hello: string }>(fakeRequest)
  fakeRequest.emit('data', JSON.stringify({ hello: 'world' }))
  fakeRequest.emit('end')
  t.strictSame(await p, { hello: 'world' })
  // verify that it enforces type expectation
  //@ts-expect-error
  p.foo = 'bar'
})

t.test('error', async t => {
  const logs = t.capture(console, 'error').args
  let endData = ''
  const fakeResponse = {
    end: (data: string) => (endData = data),
  } as unknown as ServerResponse
  json.error(fakeResponse, 'ErrorType', 'Message', 450)
  t.equal(fakeResponse.statusCode, 450)
  t.equal(endData, '"ErrorType\\nMessage"')
  json.error(fakeResponse, 'ErrorType', 'Message')
  t.equal(fakeResponse.statusCode, 500)
  t.strictSame(logs(), [['Message'], ['Message']])
})

t.test('ok', async t => {
  const head: [number, Record<string, string>][] = []
  let endData = ''
  const fakeRes = {
    writeHead: (c: number, h: Record<string, string>) =>
      head.push([c, h]),
    end: (s: string) => (endData = s),
  } as unknown as ServerResponse
  json.ok(fakeRes, 'some result')
  t.strictSame(head, [[200, { 'content-type': 'application/json' }]])
  t.equal(endData, '"some result"')
})
