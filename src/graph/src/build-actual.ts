import { resolve } from 'node:path'
import { Graph } from './graph.js'
import { Node } from './node.js'
import { Package } from './pkgs.js'
import { readPackageJson } from './read-package-json.js'
import { realpath } from './realpath.js'

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
      for (const [name, spec] of Object.entries(deps)) {
        let dir, packageJson
        try {
          dir = realpath(resolve(basepath, name))
          packageJson = readPackageJson(dir)
        } catch (err) {
          graph.placePackage(fromNode, depType, name, spec)
          continue
        }

        const node = graph.placePackage(
          fromNode,
          depType,
          name,
          spec,
          packageJson,
          dir,
        )
        if (node) {
          nextDeps.add(node)
        }
      }
    }
  }

  for (const next of nextDeps) {
    const where = next.pkg.name.startsWith('@') ? '../..' : '..'
    buildActual(graph, next, resolve(next.pkg.location, where))
  }
}
