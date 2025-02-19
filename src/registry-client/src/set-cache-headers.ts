// Set the cache headers on a request options object
// based on what we know from a CacheEntry

import { addHeader } from './add-header.ts'
import type { CacheEntry } from './cache-entry.ts'
import type { RegistryClientRequestOptions } from './index.ts'

export const setCacheHeaders = (
  options: RegistryClientRequestOptions,
  entry?: CacheEntry,
): void => {
  if (!entry) return
  const etag = entry.getHeader('etag')?.toString()
  if (etag) {
    options.headers = addHeader(
      options.headers,
      'if-none-match',
      etag,
    )
  }

  const date =
    entry.getHeader('date')?.toString() ??
    entry.getHeader('last-modified')?.toString()
  if (date) {
    options.headers = addHeader(
      options.headers,
      'if-modified-since',
      date,
    )
  }
}
