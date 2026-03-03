import t from 'tap'
import type { Dispatcher } from 'undici'
import type { CacheEntry } from '../src/cache-entry.ts'
import { handleCacheHitResponse } from '../src/handle-304-response.ts'

t.equal(
  handleCacheHitResponse({
    statusCode: 304,
  } as unknown as Dispatcher.ResponseData),
  false,
  'no entry, no hit',
)

t.equal(
  handleCacheHitResponse(
    { statusCode: 100 } as unknown as Dispatcher.ResponseData,
    {} as unknown as CacheEntry,
  ),
  false,
  'not 304 or 412, no cache hit',
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
  handleCacheHitResponse(
    resp as unknown as Dispatcher.ResponseData,
    entry as unknown as CacheEntry,
  ),
  true,
  '304 cache hit, update date',
)

t.equal(
  entry.headers.date,
  resp.headers.date,
  'date updated to response',
)

delete entry.headers.date
delete resp.headers.date

t.equal(
  handleCacheHitResponse(
    resp as unknown as Dispatcher.ResponseData,
    entry as unknown as CacheEntry,
  ),
  true,
  '304 cache hit, update date to now',
)
t.type(entry.headers.date, 'string', 'date got added')

const entry412 = {
  statusCode: 200,
  headers: {
    date: new Date('2020-01-01').toUTCString(),
  } as Record<string, string>,
  setHeader(k: string, v: Buffer) {
    this.headers[k] = String(v)
  },
}

const resp412 = {
  statusCode: 412,
  headers: {
    date: new Date('2025-06-01').toUTCString(),
  } as Record<string, string>,
  body: {
    resume: () => {},
  },
}

t.equal(
  handleCacheHitResponse(
    resp412 as unknown as Dispatcher.ResponseData,
    entry412 as unknown as CacheEntry,
  ),
  true,
  '412 treated as cache hit',
)

t.equal(
  entry412.headers.date,
  resp412.headers.date,
  '412 date updated to response',
)
