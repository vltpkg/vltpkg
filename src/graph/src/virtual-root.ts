import { Spec } from '@vltpkg/spec/browser'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type { EdgeLike, NodeLike, GraphLike } from '@vltpkg/types'

/**
 * A virtual root used to aggregate multiple importers into a single graph.
 *
 * This is meant to be used with visual tools that want a single root node
 * starting point to represent the graph.
 *
 * Returns undefined if a virtual root is not needed.
 */
export const createVirtualRoot = (
  name = 'virtual-root',
  options: SpecOptions,
  mainImporters: NodeLike[],
): NodeLike | undefined => {
  // first let's figure out if a virtual root is really needed
  // a virtual root is needed if:
  // - there are multiple mainImporters
  // - any of the mainImporters points to a different project root
  if (mainImporters.length === 1) {
    return undefined
  }

  let multiGraph = false
  const [firstImporter] = mainImporters
  const seenProjectRoot = firstImporter?.projectRoot
  for (const importer of mainImporters) {
    if (importer.projectRoot !== seenProjectRoot) {
      multiGraph = true
      break
    }
  }
  if (!multiGraph) {
    return undefined
  }

  const res = {
    id: joinDepIDTuple(['file', 'virtual-root']),
    name,
    version: '1.0.0',
    manifest: {
      name,
      version: '1.0.0',
    },
    edgesIn: new Set(),
    edgesOut: new Map<string, EdgeLike>([]),
    confused: false,
    importer: true,
    mainImporter: true,
    graph: { importers: new Set() } as GraphLike,
    projectRoot: '',
    dev: false,
    optional: false,
    options,
    setConfusedManifest() {},
    setResolved() {},
    maybeSetConfusedManifest() {},
    workspaces: undefined,
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        version: this.version,
        location: this.location,
        importer: this.importer,
        manifest: this.manifest,
        projectRoot: this.projectRoot,
        integrity: this.integrity,
        resolved: this.resolved,
        dev: this.dev,
        optional: this.optional,
        confused: false,
      }
    },
  } satisfies NodeLike

  // @ts-expect-error
  res[Symbol.toStringTag] = () => {
    return '@vltpkg/graph.Node'
  }

  // link all mainImporters to the virtual root
  for (const importer of mainImporters) {
    const name = importer.name || '(unknown)'
    if (importer.mainImporter) {
      const spec = Spec.parse(name, 'file:.', options)
      const edge = {
        name: spec.name,
        from: res,
        to: importer,
        spec,
        type: 'prod',
      } satisfies EdgeLike
      res.edgesOut.set(name, edge)
    }
  }
  return res
}
