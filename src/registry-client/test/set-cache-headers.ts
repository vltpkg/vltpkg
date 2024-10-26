import t from 'tap'
import {
  CacheEntry,
  RegistryClientRequestOptions,
} from '../src/index.js'
import { setCacheHeaders } from '../src/set-cache-headers.js'

const opts: RegistryClientRequestOptions = {}
setCacheHeaders(opts, undefined)
t.strictSame(opts, {}, 'nothing in cache, nothing to set')
setCacheHeaders(opts, {
  getHeader(k: string) {
    return k === 'etag' ? Buffer.from('"some tags"') : undefined
  },
} as unknown as CacheEntry)
t.strictSame(opts, {
  headers: {
    'if-none-match': '"some tags"',
  },
})
setCacheHeaders(opts, {
  getHeader(k: string) {
    return k === 'last-modified' ?
        Buffer.from('last modified')
      : undefined
  },
} as unknown as CacheEntry)
t.strictSame(opts, {
  headers: {
    'if-none-match': '"some tags"',
    'if-modified-since': 'last modified',
  },
})
setCacheHeaders(opts, {
  getHeader(k: string) {
    return k === 'date' ? Buffer.from('date') : undefined
  },
} as unknown as CacheEntry)
t.strictSame(opts, {
  headers: {
    'if-none-match': '"some tags"',
    'if-modified-since': 'date',
  },
})