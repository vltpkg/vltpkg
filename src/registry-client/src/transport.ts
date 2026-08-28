import type { Readable } from 'node:stream'
import { fetchTransport } from './transport-fetch.ts'
export {
  retryErrorCodes,
  retryMethods,
  retryStatusCodes,
} from './transport-retry.ts'
import type { Dispatcher } from 'undici'

/**
 * The response shape every backend produces. A subset of undici's
 * `Dispatcher.ResponseData` — the parts this package actually reads.
 */
export type TransportResponse = {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: Readable & {
    text(): Promise<string>
    json(): Promise<unknown>
    arrayBuffer(): Promise<ArrayBuffer>
  }
}

export type TransportRequestOptions = Dispatcher.RequestOptions

export type Transport = {
  request(
    options: TransportRequestOptions,
  ): Promise<TransportResponse>
}

export type TransportOptions = {
  maxRetries: number
  timeoutFactor: number
  minTimeout: number
  maxTimeout: number
}

/**
 * Pick a transport for this runtime.
 *
 * Compiled it is always `fetch`: undici's llhttp is WebAssembly and the pin
 * ships no wasm host archive, so undici cannot link. The undici import is
 * therefore dynamic and below top level — which the compiler drops, keeping
 * undici out of the binary's module graph entirely. That is deliberate; see
 * the 3a entry in scripts/perry/scan-dynamic-imports.mjs.
 */
export const loadTransport = async (
  options: TransportOptions,
): Promise<Transport> => {
  if ('perry' in process.versions) return fetchTransport(options)
  const { undiciTransport } = await import('./transport-undici.ts')
  return undiciTransport(options)
}
