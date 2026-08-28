import type { TransportResponse } from './transport.ts'
import type { CacheEntry } from './cache-entry.ts'

export const handleCacheHitResponse = (
  resp: TransportResponse,
  entry?: CacheEntry,
): entry is CacheEntry => {
  if ((resp.statusCode !== 304 && resp.statusCode !== 412) || !entry)
    return false

  const d =
    String(resp.headers.date ?? '') || new Date().toUTCString()
  entry.setHeader('date', d)
  resp.body.resume()
  return true
}
