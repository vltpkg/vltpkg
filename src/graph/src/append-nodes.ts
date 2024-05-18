import { Spec } from '@vltpkg/spec'
import { Manifest, ManifestMinified } from '@vltpkg/types'
import { Graph } from './graph.js'
import { Node } from './node.js'
import { DependencyTypeLong } from './pkgs.js'

// TODO: This should come from configs and should just point to the same
// default `registry` value that is send to: Spec.parse(value, { registry })
const origin = 'npm:'

export const appendNodes = async (
  graph: Graph,
  fromNode: Node,
  addSpecs: Spec[],
  depType: DependencyTypeLong,
) => {
  const { packages, packageInfo } = graph

  const reqs: Promise<[Manifest | ManifestMinified, Spec]>[] = []
  for (let spec of addSpecs) {
    reqs.push(packageInfo.manifest(spec).then(mani => [mani, spec]))
  }
  const res: [Manifest | ManifestMinified, Spec][] =
    await Promise.all(reqs)

  const nextDeps: Set<Node> = new Set()
  for (const [mani, spec] of res) {
    const node = graph.placePackage(
      fromNode,
      depType,
      spec,
      // TODO: Replacing with proper manifest type from @vltpkg/types
      // should fix the need for type cast here
      mani,
      undefined,
      origin,
    )
    if (node) {
      nextDeps.add(node)
    }
  }

  const appendChildNodes = []
  // loop through new nodes and their deps, recursively appending new nodes
  for (const nextDepType of packages.dependencyTypes.keys()) {
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
            appendNodes(graph, next, addSpecs, nextDepType),
          )
        }
      }
    }
  }
  await Promise.all(appendChildNodes)
}
