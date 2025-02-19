import t from 'tap'
import type { Dispatcher } from 'undici'
import type { CacheEntry } from '../src/cache-entry.ts'
import { handle304Response } from '../src/handle-304-response.ts'

t.equal(
  handle304Response({
    statusCode: 304,
  } as unknown as Dispatcher.ResponseData),
  false,
  'no entry, no hit',
)

t.equal(
  handle304Response(
    { statusCode: 100 } as unknown as Dispatcher.ResponseData,
    {} as unknown as CacheEntry,
  ),
  false,
  'not 304, no cache hit',
)

const entry = {
  statusCode: 200,
  headers: {
    date: new Date('2020-01-01').toUTCString(),
  } as Record<string, string>,
  setHeader(k: string, v: Buffer) {
    this.headers[k] = String(v)
  },
}

const resp = {
  statusCode: 304,
  headers: {
    date: new Date('2024-01-01').toUTCString(),
  } as Record<string, string>,
  body: {
    resume: () => {},
  },
}

t.equal(
  handle304Response(
    resp as unknown as Dispatcher.ResponseData,
    entry as unknown as CacheEntry,
  ),
  true,
  'cache hit, update date',
)

t.equal(
  entry.headers.date,
  resp.headers.date,
  'date updated to response',
)

delete entry.headers.date
delete resp.headers.date

t.equal(
  handle304Response(
    resp as unknown as Dispatcher.ResponseData,
    entry as unknown as CacheEntry,
  ),
  true,
  'cache hit, update date to now',
)
t.type(entry.headers.date, 'string', 'date got added')
