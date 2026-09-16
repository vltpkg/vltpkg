import { hydrate } from '@vltpkg/dep-id'
import { batchEnabled } from '@vltpkg/package-info'
import type {
  BatchWanted,
  PackageInfoClient,
} from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { Graph } from '../graph.ts'

/**
 * A rebuild without node_modules loads every node from the lockfile with no
 * manifest, and the graph build then spends one packument fetch per name
 * filling them in. Ask each registry for all of its manifests in one request
 * first, without waiting for it: the request overlaps whatever the build does
 * before it asks for its first manifest.
 *
 * Fails soft in every direction: a registry that does not serve the endpoint,
 * a request that errors, and a spec it does not resolve all leave the node
 * bare for the per-name path to handle, exactly as before.
 */
export const prefetchManifests = (
  graph: Graph,
  packageInfo: PackageInfoClient,
  options: SpecOptions,
): number => {
  if (!batchEnabled()) return 0

  const wanted: BatchWanted[] = []
  for (const node of graph.nodes.values()) {
    if (node.manifest || !node.name) continue
    const w = lockedRegistryVersion(node.id, node.name, options)
    if (w) wanted.push(w)
  }
  packageInfo.prefetchManifests(wanted)
  return wanted.length
}

/**
 * The registry, name and exact version a lockfile node resolves to, or
 * undefined for anything not fetched from a registry by exact version.
 */
const lockedRegistryVersion = (
  id: string,
  name: string,
  options: SpecOptions,
): BatchWanted | undefined => {
  let spec
  try {
    spec = hydrate(id as Parameters<typeof hydrate>[0], name, options)
  } catch {
    return
  }
  const f = spec.final
  if (f.type !== 'registry') return
  const { registry, name: specName, bareSpec } = f
  if (!registry || !specName || !bareSpec) return
  return { registry, name: specName, version: bareSpec }
}
