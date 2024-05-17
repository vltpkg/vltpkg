import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { appendNodes } from './append-nodes.js'
import { buildActual } from './build-actual.js'
import { Edge } from './edge.js'
import { Graph } from './graph.js'
import { PackageInventory } from './pkgs.js'

export type BuildStarterGraphOptions = {
  addSpecs?: string[]
  dir: string
  packageInventory: PackageInventory
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
export const buildGraph = async ({
  addSpecs = [],
  dir,
  packageInventory,
}: BuildStarterGraphOptions): Promise<Graph> => {
  const packageJson = new PackageJson()
  const rootPackageJson = packageJson.read(dir)
  const graph = new Graph(rootPackageJson, packageInventory)

  buildActual(graph, graph.root, resolve(dir, 'node_modules'), packageJson)

  const missing: Set<Edge> = graph.missingDependencies
  const specs: Spec[] = []
  for (const s of addSpecs) {
    specs.push(Spec.parse(s))
  }
  for (const e of missing) {
    specs.push(e.spec)
  }
  missing.clear()

  await appendNodes(graph, graph.root, specs, 'dependencies')

  return graph
}
