import type { Dispatcher } from 'undici'
import type { CacheEntry } from './cache-entry.ts'
import { getEncondedValue } from './string-encoding.ts'

export const collectHeaders = (
  response: Dispatcher.ResponseData,
): Uint8Array[] => {
  const h: Uint8Array[] = []
  for (const [key, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) {
      h.push(
        getEncondedValue(key),
        getEncondedValue(value.join(', ')),
      )
    } else if (typeof value === 'string') {
      h.push(getEncondedValue(key), getEncondedValue(value))
    }
  }
  return h
}

export const readBody = async (
  response: Dispatcher.ResponseData,
  entry: CacheEntry,
): Promise<CacheEntry> => {
  response.body.on('data', (chunk: Uint8Array) =>
    entry.addBody(chunk),
  )
  return await new Promise<CacheEntry>((res, rej) => {
    response.body.on('error', rej)
    response.body.on('end', () => res(entry))
  })
}
