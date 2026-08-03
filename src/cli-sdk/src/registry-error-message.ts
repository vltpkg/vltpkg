import { STATUS_CODES } from 'node:http'
import type { CacheEntry } from '@vltpkg/registry-client'

export const registryErrorMessage = (
  response: CacheEntry,
): string => {
  const statusMessage = STATUS_CODES[response.statusCode]
  const status = `${response.statusCode}${statusMessage ? ` ${statusMessage}` : ''}`

  let text: string
  try {
    text = response.text().trim()
  } catch {
    return status
  }

  if (!text) return status

  let detail = text
  try {
    const body: unknown = JSON.parse(text)
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string' &&
      body.error
    ) {
      detail = body.error
    }
  } catch {
    // A non-JSON response body is itself the most useful error detail.
  }

  return `${status} — ${detail}`
}
