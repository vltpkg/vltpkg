import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { GraphLike, NodeLike } from '@vltpkg/graph'
import type { SpecLike, SpecOptions } from '@vltpkg/spec/browser'
import type { DependencyTypeShort } from '@vltpkg/types'

export const specOptions = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const projectRoot = '.'
export const newGraph = (rootName: string): GraphLike => {
  const graph = {} as GraphLike
  const addNode = newNode(graph)
  const mainImporter = addNode(rootName)
  mainImporter.id = joinDepIDTuple(['file', '.'])
  mainImporter.mainImporter = true
  mainImporter.importer = true
  mainImporter.graph = graph
  graph.importers = new Set([mainImporter])
  graph.mainImporter = mainImporter
  graph.nodes = new Map([[mainImporter.id, mainImporter]])
  graph.edges = new Set()

  return graph
}
export const newNode =
  (graph: GraphLike) =>
  (name: string, version = '1.0.0', registry?: string): NodeLike => ({
    projectRoot,
    edgesIn: new Set(),
    edgesOut: new Map(),
    importer: false,
    mainImporter: false,
    graph,
    id: joinDepIDTuple([
      'registry',
      registry ?? '',
      `${name}@${version}`,
    ]),
    name,
    version,
    location:
      'node_modules/.vlt/·${registry}·${name}@${version}/node_modules/${name}',
    manifest: { name, version },
    rawManifest: undefined,
    integrity: 'sha512-deadbeef',
    resolved: undefined,
    dev: false,
    optional: false,
    confused: false,
    setResolved() {},
    setConfusedManifest() {},
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        version: this.version,
        location: this.location,
        importer: this.importer,
        manifest: this.manifest,
        rawManifest: this.rawManifest,
        projectRoot: this.projectRoot,
        integrity: this.integrity,
        resolved: this.resolved,
        dev: this.dev,
        optional: this.optional,
        confused: false,
      }
    },
  })
const newEdge = (
  from: NodeLike,
  spec: SpecLike<Spec>,
  type: DependencyTypeShort,
  to?: NodeLike,
) => {
  const edge = { name: spec.name, from, to, spec, type }
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
}

export const getSimpleReportGraph = (): GraphLike => {
  const graph = newGraph('my-project')
  const addNode = newNode(graph)
  const foo = addNode('@ruyadorno/foo')
  const englishDays = addNode('english-days')
  const customRegistry = addNode('registry', '1.0.1', 'custom')
  graph.nodes.set(foo.id, foo)
  graph.nodes.set(englishDays.id, englishDays)
  graph.nodes.set(customRegistry.id, customRegistry)
  newEdge(
    graph.mainImporter,
    Spec.parse('@ruyadorno/foo', '^1.0.0', specOptions),
    'prod',
    foo,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('english-days', '^1.0.0', specOptions),
    'dev',
    englishDays,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('registry', 'custom:registry@^1.0.0', specOptions),
    'dev',
    customRegistry,
  )
  return graph
}
