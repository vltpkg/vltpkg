import { error } from '@vltpkg/error-cause'
import { satisfies } from '@vltpkg/satisfies'
import type { Edge } from '../edge.ts'
import type { Dependency } from '../dependencies.ts'
import type {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
} from './types.ts'
import type { GraphModifier } from '../modifiers.ts'

export type RemoveSatisfiedSpecsOptions = BuildIdealAddOptions &
  BuildIdealFromGraphOptions & {
    modifiers?: GraphModifier
  }

/**
 * Traverse the objects defined in `add` and removes any references to specs
 * that are already satisfied by the contents of the actual `graph`.
 *
 * Returns the satisfied edges whose spec text or dependency type differs
 * from the one they were pruned against, e.g. a lockfile edge reading
 * `peer latest` where `package.json` reads `devDependencies: ^1.2.3`.
 */
export const removeSatisfiedSpecs = ({
  add,
  graph,
  modifiers,
}: RemoveSatisfiedSpecsOptions) => {
  const staleSpecs = new Map<Edge, Dependency>()
  for (const [depID, dependencies] of add.entries()) {
    const importer = graph.nodes.get(depID)
    if (!importer) {
      throw error('Referred importer node id could not be found', {
        found: depID,
      })
    }
    for (const [name, dependency] of dependencies) {
      const edge = importer.edgesOut.get(name)
      if (!edge) {
        // brand new edge being added
        continue
      }

      // If the spec type has changed (e.g., from "registry" to
      // "catalog" or vice versa), keep it in the add list so the
      // edge gets rebuilt with the updated spec, even if the
      // resolved node is the same.
      const edgeIsCatalog = edge.spec.type === 'catalog'
      const depIsCatalog = dependency.spec.type === 'catalog'
      if (edgeIsCatalog !== depIsCatalog) continue

      // a governed edge is checked against the modifier value (e.g.
      // `workspace:*` to a versionless workspace), not its own spec: one
      // built before the modifier applied must be rebuilt
      const mod = modifiers?.importerEdgeModifier(
        importer,
        dependency.spec,
      )
      // If the current graph edge is already valid, then we remove that
      // dependency item from the list of items to be added to the graph
      if (
        satisfies(
          edge.to?.id,
          mod?.type === 'edge' ? mod.spec : dependency.spec,
          edge.from.location,
          graph.projectRoot,
          graph.monorepo,
        )
      ) {
        // `implicit` is not a real edge type, it means "keep what the
        // edge already is", so it never makes an edge stale
        const typeChanged =
          dependency.type !== 'implicit' &&
          edge.type !== dependency.type
        if (mod) {
          // keeps the modifier value, the rebuild would re-apply it
          // anyway; only the type follows the manifest
          if (typeChanged) {
            staleSpecs.set(edge, { ...dependency, spec: edge.spec })
          }
        } else if (
          edge.spec.bareSpec !== dependency.spec.bareSpec ||
          typeChanged
        ) {
          staleSpecs.set(edge, dependency)
        }
        dependencies.delete(name)
      }
    }
  }

  // Removes any references to an importer that no longer has specs
  for (const [depID, dependencies] of add.entries()) {
    if (dependencies.size === 0) {
      add.delete(depID)
    }
  }

  return staleSpecs
}
