import { appendNodes } from './append-nodes.ts'
import { asDependency } from '../dependencies.ts'
import type { DepID } from '@vltpkg/dep-id'
import type {
  GraphModifier,
  ModifierActiveEntry,
} from '../modifiers.ts'
import type { Node } from '../node.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { PathScurry } from 'path-scurry'
import type { Dependency } from '../dependencies.ts'
import type { BuildIdealFromGraphOptions } from './types.ts'

export type CheckNodesOptions = BuildIdealFromGraphOptions &
  SpecOptions & {
    /**
     * The dependencies to check.
     */
    check: Map<DepID, Map<string, Dependency>>
    /**
     * A {@link GraphModifier} instance that holds information on how to
     * modify the graph, replacing nodes and edges as defined in the
     * project configuration.
     */
    modifiers?: GraphModifier
    /**
     * The package info client to use.
     */
    packageInfo: PackageInfoClient
    /**
     * The path scurry instance to use.
     */
    scurry: PathScurry
  }

/**
 * Runs an extra check and apply modifiers in all nodes that are not part
 * of the the list of nodes to add.
 */
export const checkNodes = async ({
  check,
  graph,
  modifiers,
  packageInfo,
  scurry,
  ...specOptions
}: CheckNodesOptions): Promise<void> => {
  const seen = new Set<DepID>()
  const importers = new Set<Node>(graph.importers)

  // initializes the map of modifiers with any importers marked to check
  for (const node of importers) {
    const deps = check.get(node.id)
    if (deps?.size) {
      modifiers?.tryImporter(node)
    } else {
      // otherwise we remove the importer from the list
      importers.delete(node)
    }
  }

  for (const node of importers) {
    const modifiedDeps = new Map<string, Dependency>()
    const modifierRefs = new Map<string, ModifierActiveEntry>()
    for (const [name, edge] of node.edgesOut) {
      // when we find a modifier that applies to a direct dependency, mark
      // that dependency as a dependency to be added by append-nodes
      const modifierRef = modifiers?.tryNewDependency(node, name)
      if (modifierRef && 'spec' in modifierRef.modifier) {
        modifiedDeps.set(
          name,
          asDependency({
            type: edge.type,
            spec: edge.spec,
          }),
        )
        modifierRefs.set(name, modifierRef)
      }
    }
    const deps = [...modifiedDeps.values()]
    if (modifiedDeps.size) {
      await appendNodes(
        modifiedDeps,
        packageInfo,
        graph,
        node,
        deps,
        scurry,
        specOptions,
        seen,
        modifiers,
        modifierRefs,
      )
    }
  }
}
