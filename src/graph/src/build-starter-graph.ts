import { resolve } from 'node:path'
import { Graph } from './graph.js'
import { Node } from './node.js'
import { Edge } from './edge.js'
import { appendRegistryNodes } from './append-registry-nodes.js'
import { buildActual } from './build-actual.js'
import { readPackageJson } from './read-package-json.js'

export type BuildStarterGraphOptions = {
  addSpecs: string[]
  dir: string
}

/**
 * Builds a graph that uses the `package.json` information found at `dir`
 * as a start point to look for file system package contents and reach for
 * the configured registries in order to retrieve metadata to build the
 * rest of the graph representation of what the relationship of these
 * packages are shaped like.
 * The resulting `Graph` object has references to properties such as
 * `packages.pending` that can then be used to retrieve artifacts for
 * reifying later.
 */
export const buildStarterGraph = async ({
  addSpecs,
  dir,
}: BuildStarterGraphOptions): Promise<Graph> => {
  const rootPackageJson = readPackageJson(dir)
  const graph = new Graph(rootPackageJson)

  buildActual(graph, graph.root, resolve(dir, 'node_modules'))

  const missing: Set<Edge> = graph.missingDirectDependencies
  const specs: string[][] = [...missing].map(e => [e.name, e.spec])
  missing.clear()

  await appendRegistryNodes(graph, graph.root, specs, 'dependencies')

  return graph
}
