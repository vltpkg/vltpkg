import { Dispatcher } from 'undici'
import { CacheEntry } from './cache-entry.js'

export const handle304Response = (
  resp: Dispatcher.ResponseData,
  entry?: CacheEntry,
): entry is CacheEntry => {
  if (resp.statusCode !== 304 || !entry) return false

  const d =
    String(resp.headers.date ?? '') || new Date().toUTCString()
  entry.setHeader('date', Buffer.from(d))
  // shouldn't have a body, but just in case.
  resp.body.resume()
  return true
}
