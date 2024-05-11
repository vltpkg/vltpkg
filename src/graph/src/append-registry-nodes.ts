import { error } from '@vltpkg/error-cause'
import { CacheEntry, RegistryClient } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { Graph } from './graph.js'
import { Node } from './node.js'
import { DependencyTypeLong, isPackageMetadata } from './pkgs.js'

const origin = 'npm:'
const hostname = 'https://registry.npmjs.org'

export const appendRegistryNodes = async (
  graph: Graph,
  fromNode: Node,
  addSpecs: Spec[],
  depType: DependencyTypeLong,
) => {
  const registryClient = new RegistryClient({})

  const reqs: Promise<[CacheEntry, Spec]>[] = []
  for (let spec of addSpecs) {
    // TODO: only fetching latest version of manifests for now
    reqs.push(
      registryClient
        .request(`${hostname}/${spec.name}/latest`)
        .then(response => [response, spec]),
    )
  }
  const res: [CacheEntry, Spec][] = await Promise.all(reqs)

  const nextDeps: Set<Node> = new Set()
  for (const [response, spec] of res) {
    if (response) {
      if (!isPackageMetadata(response.body)) {
        throw error('Failed to retrieve package metadata', {
          spec,
          response,
        })
      }
      const mani = response.body
      const node = graph.placePackage(
        fromNode,
        depType,
        spec,
        mani,
        undefined,
        origin,
      )
      if (node) {
        nextDeps.add(node)
      }
    }
  }

  const appendChildNodes = []
  // loop through new nodes and their deps, recursively appending new nodes
  for (const nextDepType of graph.packages.dependencyTypes.keys()) {
    // TODO: only supporting prod deps here for now
    if (nextDepType === 'dependencies') {
      for (const next of nextDeps) {
        const depRecord: Record<string, string> | undefined =
          next.pkg[nextDepType]
        if (depRecord) {
          const addSpecs: Spec[] = Object.entries(depRecord).map(
            ([key, name]) => Spec.parse(`${key}@${name}`),
          )
          appendChildNodes.push(
            appendRegistryNodes(graph, next, addSpecs, nextDepType),
          )
        }
      }
    }
  }
  await Promise.all(appendChildNodes)
}
