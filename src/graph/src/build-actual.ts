import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { Graph } from './graph.js'
import { Node } from './node.js'
import { readPackageJson } from './read-package-json.js'
import { realpath } from './realpath.js'

// TODO: this should come from the Graph constructor
const registries: Record<string, string> = {
  'https://registry.npmjs.org': 'npm:',
}

/**
 * Figure out the origin value based on the current location,
 * using then node_modules/.vlt/registry/<hostname> store folder
 */
const readOrigin = (dir: string): string => {
  const path = dir.replace(/[\\\/]+/g, '/')
  const [, encodedHostname] = path.split('.vlt/registry/')
  if (!encodedHostname) {
    return ''
  }
  const remainder = decodeURIComponent(encodedHostname)
  const [, origin] =
    Object.entries(registries).find(([key]) =>
      remainder.startsWith(key),
    ) || []
  if (!origin) {
    throw error(`Registry was not found in configs`, {
      found: remainder,
      validOptions: Object.keys(registries),
    })
  }
  return origin
}

/**
 * Populates a given `graph` with nodes and edges that represents
 * the current state of a given install found in node_modules folders
 * at a given directory `basepath`.
 */
export const buildActual = (
  graph: Graph,
  fromNode: Node,
  basepath: string,
) => {
  const nextDeps: Set<Node> = new Set()
  for (const depType of graph.packages.dependencyTypes.keys()) {
    const deps = fromNode.pkg[depType]
    const followRootDevDepsOnly =
      (depType !== 'peerDependencies' &&
        depType !== 'devDependencies') ||
      (depType === 'devDependencies' && fromNode.isRoot)

    if (deps && followRootDevDepsOnly) {
      for (const [name, rawSpec] of Object.entries(deps)) {
        const spec = Spec.parse(name, rawSpec)
        let dir, packageJson
        try {
          dir = realpath(resolve(basepath, name))
          packageJson = readPackageJson(dir)
        } catch (err) {
          graph.placePackage(fromNode, depType, spec)
          continue
        }

        const node = graph.placePackage(
          fromNode,
          depType,
          spec,
          packageJson,
          dir,
          readOrigin(dir),
        )
        if (node) {
          nextDeps.add(node)
        }
      }
    }
  }

  for (const next of nextDeps) {
    const basepath = resolve(next.pkg.location, 'node_modules')
    buildActual(graph, next, basepath)
  }
}
