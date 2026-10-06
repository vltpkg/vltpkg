import type { RegistryClient } from '@vltpkg/registry-client'
import type { Manifest } from '@vltpkg/types'
import type { Registry } from './registry.ts'
import { createInterface } from 'node:readline'

/**
 * Server-side range resolution against a vlt registry's `/-/vlt/resolve`
 * endpoint.
 *
 * One request resolves many `name@range` pairs and streams back the chosen
 * manifests for the whole dependency closure. Records reach the caller as
 * each line arrives, in the breadth-first order the server emits them, so
 * the graph build can place level N while the server still walks level N+1.
 *
 * Everything here fails soft: a registry that does not answer, a request
 * that errors, a stream that dies mid-body, and a record that does not
 * parse all leave the caller with fewer manifests than it asked for, and
 * the per-name path fills the rest in.
 */

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

/** One resolved version, as the caller receives it. */
export type ResolveRecord = {
  name: string
  version: string
  /** every spec of its level that chose this version */
  requested: string[]
  manifest: Manifest
}

/**
 * Resolve `request` against `registry`, calling `onRecord` for each version
 * the server resolves, as its line arrives. Settles when the stream ends,
 * however it ends: a caller waiting on a record that never came learns that
 * from the request settling, not from an error. Aborting `signal` ends it
 * early, keeping the records that had already arrived.
 */
export const fetchResolve = async (
  client: RegistryClient,
  registry: Registry,
  request: ResolveRequest,
  onRecord: (record: ResolveRecord) => void,
  signal?: AbortSignal,
): Promise<void> => {
  if (!request.roots.length) return

  let body
  try {
    const response = await client.requestStream(
      registry.resolve('-/vlt/resolve'),
      {
        // POST, not QUERY: CloudFront's allowed-method sets are fixed and
        // none includes QUERY. The registry answers both.
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          accept: 'application/x-ndjson',
        },
        body: JSON.stringify(request),
      },
    )
    if (response.statusCode !== 207) {
      response.body.resume()
      return
    }
    body = response.body
  } catch {
    return
  }

  try {
    // One record per line, so lines are the unit of work: a partial line
    // left by a dead stream is simply never emitted.
    for await (const line of createInterface({ input: body })) {
      const record = parseRecord(line)
      if (record) onRecord(record)
    }
  } catch {
    // A stream that died mid-body leaves the records it did not carry to
    // the per-name path, the same as specs the server did not resolve.
    body.destroy()
  }
}

const parseRecord = (l: string): ResolveRecord | undefined => {
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
  return {
    name,
    version: mani.version,
    requested: requested,
    manifest: mani,
  }
}
