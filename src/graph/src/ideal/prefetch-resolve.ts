import { detectLibc } from '@vltpkg/pick-manifest'
import type {
  PackageInfoClient,
  ResolveRequest,
} from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { Graph } from '../graph.ts'

/**
 * Start a server-side resolve for the importers' dependencies, one request
 * to the default registry, without waiting for it: the request overlaps
 * whatever the build does before it asks for its first manifest.
 *
 * Fails soft in every direction: a registry that does not serve the
 * endpoint, a request that errors, and a spec it does not resolve all
 * leave the per-name path to handle it, exactly as before.
 */
export const prefetchResolve = (
  graph: Graph,
  packageInfo: PackageInfoClient,
  options: SpecOptions & { modifiers?: unknown },
): number => {
  // same flag the client checks; read here as well so a disabled run never
  // walks the graph or touches the client (whose test doubles may not
  // carry prefetchResolve). a value import would force the real
  // package-info module graph onto every consumer that stubs it, so the
  // check is local.
  if (process.env.VLT_BATCH_RESOLVE !== '1') return 0
  // a modifier can swap any spec mid-graph, taking the server's whole
  // closure off the client's real one; those installs resolve locally
  if (options.modifiers) return 0

  const registry = options.registry
  if (!registry) return 0

  const scopes = Object.keys(options['scoped-registries'] ?? {})
  const roots: ResolveRequest['roots'] = []
  const seen = new Set<string>()
  for (const importer of graph.importers) {
    const manifest = importer.manifest
    if (!manifest) continue
    for (const field of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ] as const) {
      const deps = manifest[field]
      if (!deps) continue
      for (const [name, spec] of Object.entries(deps)) {
        if (typeof spec !== 'string') continue
        // protocols, workspace and file specs are the client's to resolve;
        // scoped-registry scopes go in `stop` below
        if (spec.includes(':')) continue
        const key = `${name}@${spec}`
        if (seen.has(key)) continue
        seen.add(key)
        roots.push({ name, spec })
      }
    }
  }
  if (!roots.length) return 0

  const have: string[] = []
  for (const node of graph.nodes.values()) {
    if (node.manifest && node.name && node.version) {
      have.push(`${node.name}@${node.version}`)
    }
  }

  packageInfo.prefetchResolve(registry, {
    roots,
    have,
    ...(scopes.length ? { stop: { scopes } } : {}),
    platform: {
      os: process.platform,
      cpu: process.arch,
      node: process.versions.node,
      // undefined never serializes, so no libc means the field is absent
      libc: detectLibc(),
    },
  })
  return roots.length
}
