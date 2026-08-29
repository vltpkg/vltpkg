import { isNode } from './node.ts'
import type { Node } from './node.ts'

/**
 * Default cap on how many distinct paths
 * {@link getDependencyPaths} will return.
 */
export const defaultMaxPaths = 5

const nodeLabel = (node: Node): string =>
  typeof node.name === 'string' ? node.name : node.id

/**
 * Default ceiling on nodes visited per call. Only reached in graphs
 * where the walk cannot make progress -- see {@link getDependencyPaths}.
 */
export const defaultMaxVisits = 1000

/**
 * Default ceiling on nodes visited by {@link countDependencyPaths}.
 * Higher than {@link defaultMaxVisits} because counting builds no
 * strings, so the per-visit cost is a set insert and a decrement.
 */
export const defaultMaxCountVisits = 50_000

export type DependencyPathsOptions = {
  /**
   * Stop after collecting this many paths. Defaults to
   * {@link defaultMaxPaths}.
   */
  maxPaths?: number
  /**
   * Stop after visiting this many nodes, whether or not any path was
   * found. Defaults to {@link defaultMaxVisits}.
   */
  maxVisits?: number
}

export type DependencyPaths = {
  /** Distinct routes, most direct first, at most `maxPaths` of them. */
  paths: string[]
  /**
   * True when the walk stopped before exhausting the graph, so there
   * are routes not listed in `paths`. Callers reporting a count must
   * say so -- "reached by 5 paths" for a package actually reached by
   * forty understates the problem.
   */
  truncated: boolean
}

/**
 * Every distinct route from an importer down to `node`, each rendered
 * as `'importer > ... > node'`, most direct first.
 *
 * Answers "why is this installed", and answers it completely: a shared
 * package is typically pulled in by several dependents, so reporting a
 * single route understates the problem. Acting on one printed parent
 * can leave the package installed via all the others.
 *
 * Returns no paths for anything that isn't a {@link Node}, and for a
 * node that is itself an importer (it has no route to report).
 *
 * Two independent bounds, because `maxPaths` alone does not bound the
 * work. Cycles terminate via the per-branch ancestor set, but a
 * strongly connected cluster with no route up to any importer -- which
 * a lockfile-loaded graph can contain -- dead-ends on that check
 * without ever recording a path, so the `maxPaths` early return never
 * fires while the walk enumerates every simple path inside the
 * cluster. `maxVisits` is what actually caps that case.
 */
export const getDependencyPaths = (
  node: unknown,
  {
    maxPaths = defaultMaxPaths,
    maxVisits = defaultMaxVisits,
  }: DependencyPathsOptions = {},
): DependencyPaths => {
  if (!isNode(node) || maxPaths < 1) {
    return { paths: [], truncated: false }
  }

  const paths: string[] = []
  let visits = 0

  // one shared trail and ancestor set, mutated on the way down and
  // restored on the way back up: copying both per edge cost O(depth)
  // per visit, making a single branch O(depth^2)
  const trail: string[] = [nodeLabel(node)]
  const seen = new Set<string>([node.id])

  const done = () => paths.length >= maxPaths || visits > maxVisits

  const walk = (current: Node): void => {
    if (done() || ++visits > maxVisits) return

    // an importer is the top of a route; a node with no inbound edges
    // is as far up as this branch goes
    if (current.importer || current.edgesIn.size === 0) {
      if (trail.length > 1) {
        // trail is leaf-to-root while walking, so reverse to render
        paths.push([...trail].reverse().join(' > '))
      }
      return
    }

    // see countDependencyPaths: two edges sharing a `from` node would
    // otherwise yield the same route twice
    const walked = new Set<string>()
    for (const edge of current.edgesIn.values()) {
      const { from } = edge
      if (seen.has(from.id) || walked.has(from.id)) continue
      walked.add(from.id)
      trail.push(nodeLabel(from))
      seen.add(from.id)
      walk(from)
      seen.delete(from.id)
      trail.pop()
      if (done()) return
    }
  }

  walk(node)
  return { paths, truncated: done() }
}

export type DependencyPathCount = {
  /** How many distinct routes were counted. */
  count: number
  /**
   * True when counting stopped at `maxVisits`, so `count` is a floor
   * rather than the total. Render it as `N+`, never as `N`.
   */
  truncated: boolean
}

/**
 * How many distinct routes reach `node`, without building any of them.
 *
 * Reporting a count is the common case -- a package reached forty ways
 * doesn't want forty lines in a summary -- and skipping the string
 * building makes it cheap enough to afford a far higher visit ceiling
 * than {@link getDependencyPaths}, so the number is much more often
 * exact.
 */
export const countDependencyPaths = (
  node: unknown,
  { maxVisits = defaultMaxCountVisits }: { maxVisits?: number } = {},
): DependencyPathCount => {
  if (!isNode(node)) return { count: 0, truncated: false }

  let count = 0
  let visits = 0
  let depth = 0
  const seen = new Set<string>([node.id])
  const spent = () => visits > maxVisits

  const walk = (current: Node): void => {
    if (++visits > maxVisits) return

    if (current.importer || current.edgesIn.size === 0) {
      if (depth > 0) count++
      return
    }

    // Two edges can share a `from` node. Because `seen` is restored
    // after each child, the second such edge would walk the identical
    // route again and count it twice, so track the parents already
    // taken at this level.
    const walked = new Set<string>()
    for (const edge of current.edgesIn.values()) {
      const { from } = edge
      if (seen.has(from.id) || walked.has(from.id)) continue
      walked.add(from.id)
      seen.add(from.id)
      depth++
      walk(from)
      depth--
      seen.delete(from.id)
      if (spent()) return
    }
  }

  walk(node)
  return { count, truncated: spent() }
}

/**
 * A package that depends on some node, paired with the version range
 * it declares for it.
 */
export type Dependent = {
  /** the dependent package's name, or its id when unnamed */
  name: string
  /**
   * The range the dependent declares, e.g. `^1.1.7`. Undefined when
   * the edge carries no parsable range (a git or file specifier, say),
   * which means the range tells you nothing about which published
   * versions are acceptable.
   */
  range?: string
}
/**
 * Every package that depends on `node`, with the range each one
 * declares.
 *
 * Whether a fix is reachable turns on these ranges: a dependent that
 * declares `^1.1.7` will resolve to a patched `1.1.17` on the next
 * install, whereas one that pins `1.1.16` has to widen its range
 * first. That is answerable from the local graph -- no registry
 * involved -- but only if the declared range is available, which is
 * why it lives here next to the path walk.
 */
export const getDependents = (node: unknown): Dependent[] => {
  if (!isNode(node)) return []

  const dependents: Dependent[] = []
  for (const edge of node.edgesIn) {
    const { semver, range } = edge.spec
    dependents.push({
      name: nodeLabel(edge.from),
      // prefer the range as written (`^1.1.7`) over the parsed form,
      // which stringifies to its expanded comparators
      // (`>=1.1.7 <2.0.0-0`) and reads far less like the manifest
      range:
        semver ? semver
        : range ? String(range)
        : undefined,
    })
  }
  return dependents
}
