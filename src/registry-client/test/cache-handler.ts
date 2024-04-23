import { Cache } from '@vltpkg/cache'
import t from 'tap'
import { Dispatcher } from 'undici'
import { CacheEntry } from '../src/cache-entry.js'
import { CacheHandler } from '../src/cache-handler.js'

const toRawHeaders = (h: Record<string, string>): Buffer[] => {
  const r: Buffer[] = []
  for (const [k, v] of Object.entries(h)) {
    r.push(Buffer.from(k), Buffer.from(v))
  }
  return r
}

const tracker = {
  onConnect: false,
  onHeaders: false,
  onError: false,
  onData: false,
  onComplete: false,
  onBodySent: false,
}
const reset = () => {
  for (const k of Object.keys(tracker) as (keyof typeof tracker)[]) {
    tracker[k] = false
  }
}

const dummyHandler: Dispatcher.DispatchHandlers = {
  onConnect(abort) {
    t.match(abort, Function)
    tracker.onConnect = true
  },
  onHeaders(statusCode, headers, resume, statusText) {
    tracker.onHeaders = true
    t.match(statusCode, Number)
    t.equal(Array.isArray(headers), true, 'headers is array')
    for (const k of headers) {
      t.match(k, Buffer, 'headers is array of Buffer')
    }
    t.match(resume, Function)
    t.match(statusText, String)
    return true
  },
  onError(err) {
    tracker.onError = true
    t.match(err, Error)
  },
  onData(chunk) {
    t.match(chunk, Buffer)
    tracker.onData = true
    return true
  },
  onComplete(trailers) {
    tracker.onComplete = true
    t.equal(trailers, null)
  },
  onBodySent(chunkSize, totalBytesSent) {
    t.equal(chunkSize, 69)
    t.equal(totalBytesSent, 420)
    tracker.onBodySent = true
  },
}

t.beforeEach(reset)

t.test('handler behavior, nothing cached yet', t => {
  const cache = new Cache({ path: t.testdir() })

  const ch = new CacheHandler({
    key: 'hello',
    handler: dummyHandler,
    cache,
    entry: undefined,
  })

  t.equal(ch.key, 'hello')
  t.equal(ch.handler, dummyHandler)
  t.equal(ch.entry, undefined)

  ch.onConnect(() => {})
  t.equal(tracker.onConnect, true)

  ch.onError(new Error('arf'))
  t.equal(tracker.onError, true)

  const resume = () => {}
  ch.onHeaders(
    200,
    toRawHeaders({
      some: 'headers',
    }),
    resume,
    'okie dokely',
  )
  t.equal(ch.resume, resume)
  t.equal(tracker.onHeaders, true)
  t.same(
    ch.entry,
    new CacheEntry(
      200,
      toRawHeaders({
        some: 'headers',
      }),
    ),
  )
  t.equal(ch.cacheable, true)

  ch.onData(Buffer.from('hello, world'))

  ch.onBodySent(69, 420)
  t.equal(tracker.onBodySent, true)

  const cached = new CacheHandler({
    key: 'hello',
    handler: dummyHandler,
    cache,
    entry: ch.entry,
  })
  cached.onHeaders(306, [], resume, 'ok')
  t.match(
    cached.entry?.getHeader('date')?.toString(),
    new RegExp(
      '^' +
        new Date()
          .toUTCString()
          .replace(/[0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/, ''),
    ),
  )

  t.end()
})
