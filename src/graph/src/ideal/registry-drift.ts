import { baseDepID, getTuple, splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import type { Spec } from '@vltpkg/spec'
import { isErrorWithCause, isObject } from '@vltpkg/types'
import type { Edge } from '../edge.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

/**
 * The DepID registry segment of each {@link pinnedRegistry} target,
 * keyed by declaring package (registry and name) and dep name.
 */
export type RegistryPins = Map<string, string>

/**
 * The {@link RegistryPins} of a locked graph, if any. Lockfile edges
 * parse with the routing stored in the lockfile, so a deliberate config
 * change creates no pins.
 */
export const collectRegistryPins = (
  graph: Graph,
): RegistryPins | undefined => {
  let pins: RegistryPins | undefined
  for (const edge of graph.edges) {
    const registry = pinnedRegistry(edge)
    if (registry === undefined) continue
    pins ??= new Map()
    pins.set(pinKey(edge.from, edge.name), registry)
  }
  return pins
}

/**
 * The DepID registry segment of the target of an edge with no registry
 * prefix, when the spec now resolves to another registry: what earlier
 * versions locked while unprefixed dependencies used their parent's
 * registry. Edges placed by this version are never pinned.
 */
export const pinnedRegistry = ({
  spec,
  to,
}: Edge): string | undefined => {
  if (!to || !isUnprefixed(spec)) return
  const [type, registry] = splitDepID(to.id)
  if (type !== 'registry' || to.name !== spec.final.name) return
  return registryOf(spec) === registry ? undefined : registry
}

/**
 * Stop before an unprefixed dependency of `fromNode` replaces its
 * pinned lockfile target with the same name from another registry.
 */
export const assertNoRegistryDrift = (
  graph: Graph,
  fromNode: Node,
  spec: Spec,
  from: string,
) => {
  const was = graph.registryPins?.get(pinKey(fromNode, spec.name))
  if (was === undefined || !isUnprefixed(spec)) return
  const now = registryOf(spec)
  if (now === was) return
  throw error(
    `${spec} is locked to ${was} but now resolves from ${now}.\n` +
      `${label(fromNode)} declares it with no registry prefix, and ` +
      `unprefixed dependencies no longer use their parent's registry.\n` +
      `To keep ${was}, ${modifierAdvice(fromNode, spec, was)}.\n` +
      `To use ${now}, add "${selector(fromNode, spec)}": ` +
      `"${prefixedSpec(now, spec)}" instead, or delete vlt-lock.json ` +
      `and node_modules and run vlt install.`,
    { code: 'ERESOLVE', spec, from, found: now, wanted: was },
    assertNoRegistryDrift,
  )
}

/**
 * Explain a registry 404 for an unprefixed dependency that took the
 * default route while its parent came from another registry. Any other
 * error is returned as is.
 */
export const withParentRegistryHint = (
  er: unknown,
  spec: Spec,
  fromNode: Node,
): unknown => {
  if (
    !isErrorWithCause(er) ||
    !isObject(er.cause) ||
    er.cause.code !== 'ERESOLVE'
  ) {
    return er
  }
  const cause = er.cause as ErrorCauseOptions
  const status = (
    cause.response as { statusCode?: unknown } | undefined
  )?.statusCode
  const [type, parent] = splitDepID(fromNode.id)
  if (
    status !== 404 ||
    type !== 'registry' ||
    !isUnprefixed(spec) ||
    // a scoped-registries entry is the user's own routing
    spec.final.scopeRegistry ||
    // jsr hosts only @jsr/* names, which the @jsr scope routes
    spec.options['jsr-registries'][parent] !== undefined
  ) {
    return er
  }
  const now = registryOf(spec)
  if (now === parent) return er
  return error(
    `${er.message}\n${spec.name} has no registry prefix, so it was ` +
      `requested from ${now}, but its parent ${label(fromNode)} came ` +
      `from ${parent}. To install it from ${parent}, ` +
      `${modifierAdvice(fromNode, spec, parent)}.`,
    { ...cause, cause: er },
    withParentRegistryHint,
  )
}

/** A bare range or dist-tag, directly or through a catalog. */
const isUnprefixed = (spec: Spec) => {
  const s =
    spec.type === 'catalog' && spec.subspec ? spec.subspec : spec
  return s.type === 'registry' && !s.subspec
}

/** The DepID registry segment `spec` resolves to. */
const registryOf = (spec: Spec) =>
  getTuple(spec, { name: spec.final.name })[1]

/**
 * The parent part of a pin key. Registry parents drop the version, so a
 * parent moved to another version by `vlt update` is still guarded.
 */
const parentKey = (node: Node) => {
  const [type, registry] = splitDepID(node.id)
  return type === 'registry' ?
      `${type}\0${registry}\0${node.name}`
    : baseDepID(node.id)
}

const pinKey = (fromNode: Node, name: string) =>
  `${parentKey(fromNode)}\0${name}`

const label = (node: Node) =>
  node.version ? `${node.name}@${node.version}` : node.name

/** The graph modifier selector of the edge from `fromNode`. */
const selector = (fromNode: Node, spec: Spec) =>
  `${fromNode.mainImporter ? ':root' : `#${depName(fromNode)}`} > #${spec.name}`

/**
 * The dependency name `#name` matches `node` by: the name of an edge
 * into it, which an alias (`"internal": "corp:internal-lib@^1"`) sets
 * apart from the package name.
 */
const depName = (node: Node) => {
  const [edge] = node.edgesIn
  return edge?.name ?? node.name
}

/** The URL of a DepID registry segment. */
const urlOf = (registry: string, spec: Spec) =>
  spec.options.registries[registry] ??
  spec.options['jsr-registries'][registry] ??
  registry

/** `spec` with an explicit prefix for `registry`. */
const prefixedSpec = (registry: string, spec: Spec) => {
  const { name, bareSpec } = spec.final
  return spec.options.registries[registry] === undefined ?
      `registry:${urlOf(registry, spec)}#${name}@${bareSpec}`
    : `${registry}:${name}@${bareSpec}`
}

/** How to keep `spec` on `registry`. */
const modifierAdvice = (
  fromNode: Node,
  spec: Spec,
  registry: string,
) => {
  const modifier =
    `add "${selector(fromNode, spec)}": ` +
    `"${prefixedSpec(registry, spec)}" to "modifiers" in vlt.json`
  const { scope } = spec.final
  return scope ?
      `map ${scope} to ${urlOf(registry, spec)} in scoped-registries, or ${modifier}`
    : modifier
}
