// given a RegistryClientOptions object, and a redirection response,

import { error } from '@vltpkg/error-cause'
import { type CacheEntry } from './cache-entry.js'
import { type RegistryClientRequestOptions } from './index.js'

export type RedirectStatus = 301 | 302 | 303 | 307 | 308

const redirectStatuses = new Set([301, 302, 303, 307, 308])

export type RedirectResponse = CacheEntry & {
  statusCode: RedirectStatus
  getHeader(key: 'location'): Buffer
}

export const isRedirect = (
  response: CacheEntry,
): response is RedirectResponse =>
  redirectStatuses.has(response.statusCode) &&
  !!response.getHeader('location')?.length

/**
 * If this response is allowed to follow the redirect (because max has not
 * been hit, and the new location has not been seen already), then return
 * the [url, options] to use for the subsequent request.
 *
 * Return [] if the response should be returned as-is.
 *
 * Throws an error if maxRedirections is hit or the redirections set already
 * contains the new location.
 *
 * Ensure that the response is in fact a redirection first, by calling
 * {@link isRedirect} on it.
 */
export const redirect = (
  options: RegistryClientRequestOptions,
  response: RedirectResponse,
  from: URL,
): [] | [URL, RegistryClientRequestOptions] => {
  const { redirections = new Set<string>(), maxRedirections = 10 } =
    options
  if (maxRedirections <= 0) return []
  if (redirections.size >= maxRedirections) {
    throw error('Maximum redirections exceeded', {
      max: maxRedirections,
      found: [...redirections],
      url: from,
    })
  }
  const location = String(response.getHeader('location'))
  const nextURL = new URL(location, from)
  if (redirections.has(String(nextURL))) {
    throw error('Redirection cycle detected', {
      max: maxRedirections,
      found: [...redirections],
      url: from,
    })
  }
  const nextOptions: RegistryClientRequestOptions = {
    ...options,
    redirections,
  }
  delete nextOptions.path
  redirections.add(String(nextURL))
  switch (response.statusCode) {
    case 303: {
      // drop body, change method to GET
      nextOptions.method = 'GET'
      nextOptions.body = undefined
      // fallthrough
    }
    case 301:
    case 302: // some user agents treat as 303, but they're wrong
    case 307:
    case 308: {
      return [nextURL, nextOptions]
    }
  }
}
