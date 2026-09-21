import type { RegistryClient } from '@vltpkg/registry-client'
import type { Manifest } from '@vltpkg/types'

/**
 * Server-side range resolution against a vlt registry's `/-/vlt/resolve`
 * endpoint, behind `VLT_BATCH_RESOLVE=1` while it settles.
 *
 * One request resolves many `name@range` pairs and streams back the chosen
 * manifests for the whole dependency closure. Everything here fails soft: a
 * registry that does not answer, a request that errors, and a record that
 * does not parse all leave the caller with fewer manifests than it asked
 * for, and the per-name path fills the rest in.
 */

/** Opt in while the endpoint is experimental. */
export const resolveEnabled = (): boolean =>
  process.env.VLT_BATCH_RESOLVE === '1'

/** The request body `/-/vlt/resolve` takes. */
export type ResolveRequest = {
  roots: { name: string; spec: string }[]
  platform?: {
    os?: string
    cpu?: string
    libc?: string
    node?: string
  }
  tag?: string
  have?: string[]
  stop?: { names?: string[]; scopes?: string[] }
  closure?: boolean
}

/** What one resolve response delivered. */
export type ResolveResult = {
  /** `name@spec` (the range as requested) -> manifest */
  byRange: Map<string, Manifest>
  /** `name@version` (the resolved version) -> manifest */
  byExact: Map<string, Manifest>
}

// Registries answer the capability document once per process. A registry
// that does not support resolution must not be asked again on every
// install step, so failures memoize as `false` too.
const capabilities = new Map<string, Promise<boolean>>()

/** Forget every memoized probe. Exposed for tests. */
export const resetResolveCapabilities = () => capabilities.clear()

/**
 * Whether `registry` serves the resolve endpoint. A 404, 405 or 501, a
 * network error, or a document without a `resolve` key all mean no.
 */
export const supportsResolve = async (
  client: RegistryClient,
  registry: string,
): Promise<boolean> => {
  const seen = capabilities.get(registry)
  if (seen) return seen
  const probe = probeCapabilities(client, registry)
  capabilities.set(registry, probe)
  return probe
}

/**
 * Resolve `request` against `registry` and index what came back. Specs the
 * server did not resolve are absent, as is everything when the request
 * fails.
 */
export const fetchResolve = async (
  client: RegistryClient,
  registry: string,
  request: ResolveRequest,
): Promise<ResolveResult> => {
  const result: ResolveResult = {
    byRange: new Map(),
    byExact: new Map(),
  }
  if (!request.roots.length) return result

  let body: string
  try {
    const response = await client.request(
      new URL('-/vlt/resolve', registry),
      {
        // POST, not QUERY: CloudFront's allowed-method sets are fixed and
        // none includes QUERY. The registry answers both.
        method: 'POST',
        useCache: false,
        headers: {
          'content-type': 'application/json',
          accept: 'application/x-ndjson',
        },
        body: JSON.stringify(request),
      },
    )
    if (response.statusCode !== 207) return result
    body = response.text()
  } catch {
    return result
  }

  for (const l of body.split('\n')) {
    if (!l) continue
    const record = parseRecord(l)
    if (!record) continue
    result.byExact.set(
      `${record.name}@${record.version}`,
      record.manifest,
    )
    for (const spec of record.requested) {
      result.byRange.set(`${record.name}@${spec}`, record.manifest)
    }
  }
  return result
}

const probeCapabilities = async (
  client: RegistryClient,
  registry: string,
): Promise<boolean> => {
  try {
    const response = await client.request(
      // TEMP benchmark-only: bust the edge cache; the deployed capability
      // doc is younger than its 24h TTL
      new URL(`-/vlt/capabilities?t=${Date.now()}`, registry),
      { headers: { accept: 'application/json' } },
    )
    if (response.statusCode !== 200) return false
    const doc = response.json() as { resolve?: unknown }
    return typeof doc.resolve === 'string'
  } catch {
    return false
  }
}

const parseRecord = (
  l: string,
):
  | {
      name: string
      version: string
      requested: string[]
      manifest: Manifest
    }
  | undefined => {
  // parsed wire data: nothing about its shape can be assumed
  let record: {
    status?: unknown
    name?: unknown
    requested?: unknown
    manifest?: unknown
  }
  try {
    record = JSON.parse(l) as typeof record
  } catch {
    return
  }
  const { status, name, requested, manifest } = record
  if (status !== 200 || typeof name !== 'string') return
  if (
    !Array.isArray(requested) ||
    !requested.every(s => typeof s === 'string')
  )
    return
  if (typeof manifest !== 'object' || manifest === null) return
  const mani = manifest as Manifest
  // the manifest must be the package its record names, and carry the
  // version it resolved to: these entries are handed out by key, so a
  // registry mixup would poison the lookup
  if (mani.name !== name || typeof mani.version !== 'string') return
  return { name, version: mani.version, requested, manifest: mani }
}
