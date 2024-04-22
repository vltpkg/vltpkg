import { URL } from 'node:url'
import { CacheEntry, RegistryClient } from '@vltpkg/registry-client'
import { Graph } from './graph.js'
import { Node } from './node.js'
import {
  DependencyTypeLong,
  isPackageMetadata,
  Package,
} from './pkgs.js'

const hostname = 'https://registry.npmjs.com'

export const appendRegistryNodes = async (
  graph: Graph,
  fromNode: Node,
  addSpecs: string[][],
  depType: DependencyTypeLong,
) => {
  const registryClient = new RegistryClient({})

  const reqs: Promise<[CacheEntry, string, string]>[] = []
  for (let [name, spec] of addSpecs) {
    if (!name) {
      throw new Error('Trying to add a package but no name was found')
    }
    if (!spec) {
      spec = 'latest'
    }
    // TODO: only fetching latest version of manifests for now
    reqs.push(
      registryClient
        .request(`${hostname}/${name}/latest`)
        .then(response => [response, name, spec]),
    )
  }
  const res: [CacheEntry, string, string][] = await Promise.all(reqs)

  const nextDeps: Set<Node> = new Set()
  for (const [response, name, spec] of res) {
    if (response) {
      if (!isPackageMetadata(response.body)) {
        throw new Error('Failed to retrieve package metadata')
      }
      const mani = response.body
      const node = graph.placePackage(
        fromNode,
        depType,
        name,
        spec,
        mani,
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
          const addSpecs: string[][] = Object.entries(depRecord)
          appendChildNodes.push(
            appendRegistryNodes(graph, next, addSpecs, nextDepType),
          )
        }
      }
    }
  }
  await Promise.all(appendChildNodes)
}
