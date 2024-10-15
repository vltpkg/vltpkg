import { DepID } from '@vltpkg/dep-id'
import {
  defaultRegistry,
  defaultRegistries,
  defaultGitHosts,
  defaultGitHostArchives,
  defaultScopeRegistries,
  SpecOptions,
} from '@vltpkg/spec'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type Edge } from '../edge.js'
import { type Graph } from '../graph.js'
import { type Node } from '../node.js'
import {
  getFlagNumFromNode,
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileEdgeValue,
  LockfileNode,
} from './types.js'

export type SaveOptions = SpecOptions & {
  /**
   * The graph to be stored in the lockfile.
   */
  graph: Graph
  /**
   * Should it save manifest data in the lockfile?
   */
  saveManifests?: boolean
}

const formatNodes = (
  nodes: Iterable<Node>,
  saveManifests?: boolean,
  registry?: string,
) => {
  // we do not store importers in the lockfile, though we do store
  // their edges. when we load, we always read workspaces/main fresh.
  const arr: Node[] = [...nodes].filter(node => !node.importer)
  // nodes are sorted in order to have a deterministic result
  const orderedNodes: Node[] = arr.sort((a, b) =>
    a.id.localeCompare(b.id, 'en'),
  )

  const res: Record<DepID, LockfileNode> = {}
  for (const node of orderedNodes) {
    const customRegistry =
      node.resolved && registry && !node.resolved.startsWith(registry)
    const resolved = customRegistry ? node.resolved : undefined
    // if it's in a location other than the default, stash that
    const location =
      (
        node.id.startsWith('file') ||
        node.location.endsWith(
          '/node_modules/.vlt/' +
            node.id +
            '/node_modules/' +
            node.name,
        )
      ) ?
        undefined
      : node.location

    const flags = getFlagNumFromNode(node)
    const lockfileNode: LockfileNode = [flags, node.name]

    if (node.integrity) {
      lockfileNode[2] = node.integrity
    }

    if (resolved) {
      lockfileNode[3] = resolved
    }

    if (location) {
      lockfileNode[4] = location
    }

    if (saveManifests) {
      lockfileNode[5] = node.manifest
    }

    res[node.id] = lockfileNode
  }
  return res
}

const formatEdges = (edges: Set<Edge>): LockfileEdges =>
  Object.fromEntries(
    [...edges]
      .sort(
        (a, b) =>
          /* c8 ignore start - nondeterminstic and annoying to test */
          // sort importers to the top, then alphabetically by
          // id, type, target
          Number(b.from.importer) - Number(a.from.importer) ||
          a.from.id.localeCompare(b.from.id, 'en') ||
          a.type.localeCompare(b.type, 'en') ||
          (a.to?.id ?? '').localeCompare(b.to?.id ?? ''),
        /* c8 ignore stop */
      )
      .map((edge): [LockfileEdgeKey, LockfileEdgeValue] => [
        `${edge.from.id} ${edge.spec.name}`,
        `${edge.type} ${edge.spec.bareSpec || '*'} ${edge.to?.id ?? 'MISSING'}`,
      ]),
  )

const isRecordStringString = (
  registries: unknown,
): registries is Record<string, string> =>
  !(!registries || typeof registries === 'string')

const removeDefaultItems = (
  defaultItems: Record<string, string>,
  items: Record<string, string>,
) => {
  const res: Record<string, string> = {}
  for (const [key, value] of Object.entries(items)) {
    if (!defaultItems[key] || defaultItems[key] !== value) {
      res[key] = value
    }
  }
  return res
}

export const lockfileData = ({
  graph,
  'git-hosts': gitHosts,
  'git-host-archives': gitHostArchives,
  registry,
  registries,
  saveManifests,
  'scope-registries': scopeRegistries,
}: SaveOptions): LockfileData => {
  const cleanGitHosts =
    isRecordStringString(gitHosts) ?
      removeDefaultItems(defaultGitHosts, gitHosts)
    : undefined
  const cleanGitHostArchives =
    isRecordStringString(gitHostArchives) ?
      removeDefaultItems(defaultGitHostArchives, gitHostArchives)
    : undefined
  const cleanRegistries =
    isRecordStringString(registries) ?
      removeDefaultItems(defaultRegistries, registries)
    : undefined
  const cleanScopeRegistries =
    isRecordStringString(scopeRegistries) ?
      removeDefaultItems(defaultScopeRegistries, scopeRegistries)
    : undefined
  const hasItems = (clean: Record<string, string> | undefined) =>
    clean && Object.keys(clean).length
  return {
    options: {
      ...(hasItems(cleanScopeRegistries) ?
        { 'scope-registries': cleanScopeRegistries }
      : undefined),
      ...(registry !== undefined && registry !== defaultRegistry ?
        { registry }
      : undefined),
      ...(hasItems(registries) ?
        { registries: cleanRegistries }
      : undefined),
      ...(hasItems(cleanGitHosts) ?
        { 'git-hosts': cleanGitHosts }
      : undefined),
      ...(hasItems(cleanGitHostArchives) ?
        { 'git-host-archives': cleanGitHostArchives }
      : undefined),
    },
    nodes: formatNodes(graph.nodes.values(), saveManifests, registry),
    edges: formatEdges(graph.edges),
  }
}

// renders each node / edge as a single line entry
const extraFormat = (jsonString: string) => {
  const str = `${jsonString}\n`
  const [init, ...parts] = str.split('  "nodes": {')
  const res = [init]
  for (const part of parts) {
    res.push(
      part.replaceAll('\n      ', '').replaceAll('\n    ]', ']'),
    )
  }
  return res.join('  "nodes": {')
}

export const saveData = (
  data: LockfileData,
  fileName: string,
  saveManifests = false,
) => {
  const json = JSON.stringify(data, null, 2)
  const content = saveManifests ? json : extraFormat(json)
  writeFileSync(fileName, content)
}

export const save = (options: SaveOptions) => {
  const { graph } = options
  const data = lockfileData({ ...options, saveManifests: false })
  const fileName = resolve(graph.projectRoot, 'vlt-lock.json')
  return saveData(data, fileName, false)
}

export const saveHidden = (options: SaveOptions) => {
  const { graph } = options
  const data = lockfileData({ ...options, saveManifests: true })
  const fileName = resolve(
    graph.projectRoot,
    'node_modules/.vlt-lock.json',
  )
  mkdirSync(dirname(fileName), { recursive: true })
  return saveData(data, fileName, true)
}
