import type { RegistryClient } from '@vltpkg/registry-client'

/**
 * What `GET /-/vlt/capabilities` answers: the vlt extensions a registry
 * serves. Every field is optional — a registry that has never heard of the
 * document, or that is down when it is asked, reads as an empty one.
 */
export type Capabilities = {
  /** contract version of `/-/vlt/manifests`, the batch manifest endpoint */
  manifests?: string
  /** contract version of `/-/vlt/resolve`, server-side range resolution */
  resolve?: string
  /** contract version of the `?stable` packument filter */
  'stable-filter'?: string
  /** packument media types the registry serves, most preferred first */
  mimeTypes?: string[]
}

/** What a registry with no vlt extensions supports. */
const none: Capabilities = Object.freeze({})

/**
 * The document each registry answered, by capabilities URL. This coalesces
 * the concurrent asks a single install makes; what keeps the document off
 * the network is the RegistryClient disk cache behind it.
 */
const asked = new Map<string, Promise<Capabilities>>()

/** Forget every registry that has been asked. Exposed for tests. */
export const resetCapabilities = () => asked.clear()

/**
 * The vlt extensions `registry` serves. Anything short of a capability
 * document — a registry that 404s it, a request that fails, a body that
 * does not parse — answers an empty one, so a caller that reads a missing
 * key as unsupported treats those registries as plain npm registries.
 */
export const getCapabilities = async (
  client: RegistryClient,
  registry: string,
): Promise<Capabilities> => {
  const url = String(new URL('-/vlt/capabilities', registry))
  const seen = asked.get(url)
  if (seen) return seen
  const doc = fetchCapabilities(client, url)
  asked.set(url, doc)
  return doc
}

const fetchCapabilities = async (
  client: RegistryClient,
  url: string,
): Promise<Capabilities> => {
  try {
    // No `useCache: false`: the registry serves this with a day of
    // max-age, so the RegistryClient disk cache answers it for the rest
    // of the day, including from later processes. One GET per registry
    // per day, not one per install.
    const response = await client.request(url, {
      headers: { accept: 'application/json' },
    })
    if (response.statusCode !== 200) return none
    return asCapabilities(response.json())
  } catch {
    return none
  }
}

/**
 * Read a parsed body as a capability document, dropping any field that did
 * not arrive in the shape the contract gives it.
 */
const asCapabilities = (body: unknown): Capabilities => {
  if (typeof body !== 'object' || body === null) return none
  const doc = body as Record<string, unknown>
  const caps: Capabilities = {}
  for (const key of [
    'manifests',
    'resolve',
    'stable-filter',
  ] as const) {
    const version = doc[key]
    if (typeof version === 'string') caps[key] = version
  }
  const { mimeTypes } = doc
  if (
    Array.isArray(mimeTypes) &&
    mimeTypes.every(type => typeof type === 'string')
  ) {
    caps.mimeTypes = mimeTypes
  }
  return caps
}
