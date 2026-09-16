import type { RegistryClient } from '@vltpkg/registry-client'
import type { Manifest } from '@vltpkg/types'

/**
 * Batch manifest fetching against a vlt registry, behind
 * `VLT_BATCH_MANIFESTS=1` while the endpoint settles.
 *
 * One request returns the manifests for many exact `name@version` specs,
 * where the per-name path fetches a whole packument per name. Everything
 * here fails soft: a registry that does not answer, a request that errors,
 * or a record that does not parse all leave the caller with fewer manifests
 * than it asked for, and the per-name path fills the rest in.
 */

/** Opt in while the endpoint is experimental. */
export const batchEnabled = (): boolean =>
  process.env.VLT_BATCH_MANIFESTS === '1'

/** A batch of this many specs or fewer goes in one request. */
export const MAX_BATCH_SPECS = 5000

/** What `GET /-/vlt/capabilities` answers. */
export type Capabilities = {
  manifests?: string
}

// Registries answer the capability document once per process. A registry
// that does not support batching must not be asked again on every install
// step, so failures memoize as `false` too.
const capabilities = new Map<string, Promise<boolean>>()

/** Forget every memoized probe. Exposed for tests. */
export const resetCapabilities = () => capabilities.clear()

/**
 * Whether `registry` serves the batch manifest endpoint. A 404, 405 or 501,
 * a network error, or a document without a `manifests` key all mean no.
 */
export const supportsBatch = async (
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
 * The manifests for `specs`, keyed by the spec that asked for them. Specs the
 * registry did not resolve are absent, as are all of them when the request
 * fails. Records for specs that were not asked for, and records whose
 * manifest does not carry the name and version its spec names, are dropped.
 */
export const fetchBatch = async (
  client: RegistryClient,
  registry: string,
  specs: string[],
): Promise<Map<string, Manifest>> => {
  const found = new Map<string, Manifest>()
  if (!specs.length) return found
  const requested = new Set(specs)

  let body: string
  try {
    const response = await client.request(
      new URL('-/vlt/manifests', registry),
      {
        // POST, not QUERY: CloudFront's allowed-method sets are fixed and
        // none includes QUERY. The registry answers both.
        method: 'POST',
        useCache: false,
        headers: {
          'content-type': 'application/json',
          accept: 'application/x-ndjson',
        },
        body: JSON.stringify({ specs }),
      },
    )
    if (response.statusCode !== 207) return found
    body = response.text()
  } catch {
    return found
  }

  for (const line of body.split('\n')) {
    if (!line) continue
    const record = parseRecord(line)
    if (record && requested.has(record.spec)) {
      found.set(record.spec, record.manifest)
    }
  }
  return found
}

/**
 * Split `specs` into requests the endpoint accepts, in the order given.
 */
export const batches = (specs: string[]): string[][] => {
  const out: string[][] = []
  for (let i = 0; i < specs.length; i += MAX_BATCH_SPECS) {
    out.push(specs.slice(i, i + MAX_BATCH_SPECS))
  }
  return out
}

const probeCapabilities = async (
  client: RegistryClient,
  registry: string,
): Promise<boolean> => {
  try {
    const response = await client.request(
      new URL('-/vlt/capabilities', registry),
      { headers: { accept: 'application/json' } },
    )
    if (response.statusCode !== 200) return false
    const doc = response.json() as Capabilities
    return typeof doc.manifests === 'string'
  } catch {
    return false
  }
}

const parseRecord = (
  line: string,
): { spec: string; manifest: Manifest } | undefined => {
  // parsed wire data: nothing about its shape can be assumed
  let record: { status?: unknown; spec?: unknown; manifest?: unknown }
  try {
    record = JSON.parse(line) as typeof record
  } catch {
    return
  }
  const { spec, manifest } = record
  if (record.status !== 200 || typeof spec !== 'string') return
  if (typeof manifest !== 'object' || manifest === null) return
  // the manifest must be the one its spec names: these entries are handed
  // out by exact key, so a registry mixup would poison the lookup
  const mani = manifest as Manifest
  const at = spec.lastIndexOf('@')
  if (mani.name !== spec.slice(0, at)) return
  if (mani.version !== spec.slice(at + 1)) return
  return { spec, manifest: mani }
}
