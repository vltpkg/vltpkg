import EventEmitter from 'node:events'
import { setTimeout } from 'node:timers/promises'
import t from 'tap'

const waits: number[] = []
const { retry } = await t.mockImport<
  typeof import('../src/retry.ts')
>('../src/retry.ts', {
  'node:timers/promises': {
    // record the wait, don't sit through it
    setTimeout: (
      ms: number,
      v: null,
      o: { signal?: AbortSignal },
    ) => {
      waits.push(ms)
      return setTimeout(0, v, o)
    },
  },
})

const retryOptions = {
  maxRetries: 2,
  minTimeout: 10,
  maxTimeout: 5000,
  timeoutFactor: 2,
  methods: ['GET'],
  statusCodes: [503],
  errorCodes: ['ECONNRESET'],
}

const err = (props: object) => Object.assign(new Error('x'), props)

const run = (er: Error, counter = 1, opts: object = {}) => {
  waits.length = 0
  return new Promise<Error | null | undefined>(res =>
    retry(
      er,
      {
        state: { counter },
        opts: {
          method: 'GET',
          path: '/',
          retryOptions,
          ...opts,
        },
      },
      res,
    ),
  )
}

t.test('gives up', async t => {
  const cases: [string, Error, number?, object?][] = [
    ['other code', err({ code: 'EOTHER' })],
    ['method', err({ statusCode: 503 }), 1, { method: 'POST' }],
    ['status', err({ statusCode: 404 })],
    ['retries used up', err({ statusCode: 503 }), 3],
  ]
  for (const [name, er, counter, opts] of cases) {
    t.equal(await run(er, counter, opts), er, name)
    t.strictSame(waits, [], 'no wait')
  }
})

t.test('waits, then retries', async t => {
  const cases: [string, Error, number, number][] = [
    ['error code', err({ code: 'ECONNRESET' }), 1, 10],
    [
      'status, backoff',
      err({ code: 'UND_ERR_REQ_RETRY', statusCode: 503 }),
      2,
      20,
    ],
    [
      'retry-after seconds',
      err({ statusCode: 503, headers: { 'retry-after': '3' } }),
      1,
      3000,
    ],
    [
      'retry-after over max',
      err({ statusCode: 503, headers: { 'retry-after': '30' } }),
      1,
      5000,
    ],
    [
      'invalid retry-after',
      err({ statusCode: 503, headers: { 'retry-after': 'soon' } }),
      1,
      10,
    ],
  ]
  for (const [name, er, counter, wait] of cases) {
    t.equal(await run(er, counter), null, name)
    t.strictSame(waits, [wait], name)
  }

  const date = new Date(Date.now() + 4000).toUTCString()
  t.equal(
    await run(
      err({ statusCode: 503, headers: { 'retry-after': date } }),
    ),
    null,
  )
  t.ok(waits[0]! > 2000 && waits[0]! <= 4000, 'retry-after date')
})

t.test('abort ends the wait', async t => {
  const er = err({ statusCode: 503 })
  t.match(await run(er, 1, { signal: AbortSignal.abort() }), {
    name: 'AbortError',
  })
  t.equal(
    await run(er, 1, { signal: new AbortController().signal }),
    null,
  )
  t.equal(
    await run(er, 1, { signal: new EventEmitter() }),
    null,
    'not an AbortSignal, ignored',
  )
})
