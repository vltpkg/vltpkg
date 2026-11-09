import { joinDepIDTuple, splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import {
  LockfileNodeFlagBrotli,
  LockfileNodeFlagOptional,
} from '@vltpkg/graph'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdgeValue,
  LockfileNode,
  LockfileNodeFlags,
} from '@vltpkg/graph'
import { posix } from 'node:path'

/**
 * The folder, relative to the deploy target, that holds copies of the
 * workspaces the deployed package depends on.
 */
export const deployWorkspacesDir = '.vlt-deploy'

/** A workspace that gets copied into the deploy target. */
export type DeployWorkspace = {
  /** the workspace's id in the source project */
  id: DepID
  /** the workspace's path relative to the source project root */
  path: string
  /** the id the workspace gets in the deploy target */
  deployId: DepID
  /** the workspace's path relative to the deploy target */
  deployPath: string
  /**
   * dependencies of this workspace on the deployed package, with the
   * `file:` spec that replaces their `workspace:` spec in the copy
   */
  rootSpecs: Record<string, string>
}

export type DeployLockfileResult = {
  /** the lockfile to write into the deploy target */
  lockfile: LockfileData
  /** the workspaces the deployed package needs, sorted by path */
  workspaces: DeployWorkspace[]
}

type Edge = {
  key: LockfileEdgeKey
  name: string
  type: string
  spec: string
  to: DepID | 'MISSING'
}

const mainImporterId = joinDepIDTuple(['file', '.'])

const parseEdge = (
  key: LockfileEdgeKey,
  value: LockfileEdgeValue,
): { from: DepID; edge: Edge } => {
  const nameStart = key.indexOf(' ')
  const typeEnd = value.indexOf(' ')
  const specEnd = value.lastIndexOf(' ')
  return {
    from: key.slice(0, nameStart) as DepID,
    edge: {
      key,
      name: key.slice(nameStart + 1),
      type: value.slice(0, typeEnd),
      spec: value.slice(typeEnd + 1, specEnd),
      to: value.slice(specEnd + 1) as DepID | 'MISSING',
    },
  }
}

const isImporter = (id: DepID) =>
  id === mainImporterId || splitDepID(id)[0] === 'workspace'

const isOptionalEdge = (type: string) =>
  type === 'optional' || type === 'peerOptional'

/**
 * Build the lockfile for a deploy target out of the source project's
 * lockfile.
 *
 * The result has only the nodes and edges reachable from `rootId`
 * through production edges (`dev` edges of importers are skipped).
 * `rootId` becomes the main importer of the new lockfile, and every
 * workspace it reaches is moved under {@link deployWorkspacesDir}.
 * Node flags are recomputed: no node is `dev`, and a node is `optional`
 * when only optional edges reach it.
 */
export const deployLockfile = (
  data: LockfileData,
  rootId: DepID,
): DeployLockfileResult => {
  const edgesFrom = new Map<DepID, Edge[]>()
  for (const [key, value] of Object.entries(data.edges) as [
    LockfileEdgeKey,
    LockfileEdgeValue,
  ][]) {
    const { from, edge } = parseEdge(key, value)
    const list = edgesFrom.get(from)
    if (list) list.push(edge)
    else edgesFrom.set(from, [edge])
  }

  // The edges the deploy keeps. Importers lose their dev edges because
  // the deployed copies have no devDependencies.
  const keptEdges = (id: DepID): Edge[] => {
    const edges = edgesFrom.get(id) ?? []
    return isImporter(id) ?
        edges.filter(e => e.type !== 'dev')
      : edges
  }

  // Walk the graph from the root. With `requiredOnly`, optional edges
  // are not followed, so the result is the set of required nodes.
  const walk = (requiredOnly: boolean): Set<DepID> => {
    const seen = new Set<DepID>([rootId])
    const queue: DepID[] = [rootId]
    for (let id = queue.shift(); id; id = queue.shift()) {
      for (const edge of keptEdges(id)) {
        if (edge.to === 'MISSING') continue
        if (requiredOnly && isOptionalEdge(edge.type)) continue
        if (seen.has(edge.to)) continue
        seen.add(edge.to)
        queue.push(edge.to)
      }
    }
    return seen
  }

  const reached = walk(false)
  const required = walk(true)

  const workspaces: DeployWorkspace[] = []
  const remap = new Map<DepID, DepID>([[rootId, mainImporterId]])
  for (const id of reached) {
    if (id === rootId) continue
    const tuple = splitDepID(id)
    if (tuple[0] === 'workspace') {
      const path = tuple[1]
      const deployPath = posix.join(deployWorkspacesDir, path)
      const deployId = joinDepIDTuple(['workspace', deployPath])
      workspaces.push({
        id,
        path,
        deployId,
        deployPath,
        rootSpecs: {},
      })
      remap.set(id, deployId)
    } else if (tuple[0] === 'file') {
      // file: paths point into the source project, which the deploy
      // target does not have.
      throw error('vlt deploy does not support file: dependencies', {
        code: 'EUSAGE',
        found: id,
      })
    }
  }
  workspaces.sort((a, b) => a.path.localeCompare(b.path, 'en'))

  const mapId = (id: DepID) => remap.get(id) ?? id
  const workspaceById = new Map(workspaces.map(ws => [ws.id, ws]))

  const nodes: Record<DepID, LockfileNode> = {}
  // nodes keep the order of the source lockfile
  for (const [id, node] of Object.entries(data.nodes) as [
    DepID,
    LockfileNode,
  ][]) {
    if (!reached.has(id)) continue
    const flags = ((node[0] & LockfileNodeFlagBrotli) |
      (required.has(id) ? 0 : (
        LockfileNodeFlagOptional
      ))) as LockfileNodeFlags
    nodes[id] = [flags, ...node.slice(1)] as LockfileNode
  }

  const edges: LockfileData['edges'] = {}
  const sortedEdges: [LockfileEdgeKey, LockfileEdgeValue][] = []
  for (const id of reached) {
    for (const edge of keptEdges(id)) {
      let { spec } = edge
      if (edge.to === rootId) {
        // The deployed package is the root of the target, not a
        // workspace there. A workspace that depends on it (a workspace
        // cycle) gets a file: link to the root instead.
        const ws = workspaceById.get(id)
        if (!ws) {
          throw error(
            'Unexpected dependency on the deployed package',
            {
              found: `${id} ${edge.name}`,
            },
          )
        }
        spec = `file:${posix.relative(ws.deployPath, '.')}`
        ws.rootSpecs[edge.name] = spec
      }
      const to = edge.to === 'MISSING' ? edge.to : mapId(edge.to)
      sortedEdges.push([
        `${mapId(id)} ${edge.name}`,
        `${edge.type} ${spec} ${to}` as LockfileEdgeValue,
      ])
    }
  }
  // sorted so the result is stable
  sortedEdges.sort(([a], [b]) => a.localeCompare(b, 'en'))
  for (const [key, value] of sortedEdges) edges[key] = value

  return {
    lockfile: {
      lockfileVersion: data.lockfileVersion,
      options: data.options,
      nodes,
      edges,
    },
    workspaces,
  }
}
