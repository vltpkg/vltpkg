import { detectLibc } from '@vltpkg/pick-manifest'
import type {
  PackageInfoClient,
  ResolveRequest,
} from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { Graph } from '../graph.ts'

const nothing = () => {}

/**
 * Start a server-side resolve for the importers' dependencies the starting
 * graph does not already satisfy, one request to the default registry,
 * without waiting for it: the request overlaps whatever the build does
 * before it asks for its first manifest. A graph loaded whole from a
 * lockfile or node_modules sends nothing.
 *
 * Returns the function that releases the request, for the build to call
 * once it has placed its last node.
 *
 * Fails soft in every direction: a registry that does not serve the
 * endpoint, a request that errors, and a spec it does not resolve all
 * leave the per-name path to handle it, exactly as before.
 */
export const prefetchResolve = (
  graph: Graph,
  packageInfo: PackageInfoClient,
  options: SpecOptions & { modifiers?: unknown },
): (() => void) => {
  // a modifier can swap any spec mid-graph, taking the server's whole
  // closure off the client's real one; those installs resolve locally
  if (options.modifiers) return nothing

  const registry = options.registry
  if (!registry) return nothing

  const scopes = Object.keys(options['scoped-registries'] ?? {})
  // a name under a scoped registry is that registry's; it is not sent to
  // this one at all, and `stop` keeps the server from walking into it
  const scoped = (name: string) =>
    scopes.some(scope => name.startsWith(`${scope}/`))
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
        // protocols, workspace and file specs are the client's to resolve
        if (spec.includes(':') || scoped(name)) continue
        // an edge the starting graph already resolves to a node that
        // satisfies this very spec is settled; the build keeps it as is
        const edge = importer.edgesOut.get(name)
        if (edge?.to && edge.spec.bareSpec === spec && edge.valid())
          continue
        const key = `${name}@${spec}`
        if (seen.has(key)) continue
        seen.add(key)
        roots.push({ name, spec })
      }
    }
  }
  if (!roots.length) return nothing

  const have: string[] = []
  for (const node of graph.nodes.values()) {
    if (
      node.manifest &&
      node.name &&
      node.version &&
      !scoped(node.name)
    ) {
      have.push(`${node.name}@${node.version}`)
    }
  }

  return packageInfo.prefetchResolve(registry, {
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
}
