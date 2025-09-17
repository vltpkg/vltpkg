import { transfer, createVirtualRoot } from '@vltpkg/graph/browser'
import type { TransferData } from '@/state/types.ts'
import type {
  HostContextsMap,
  HostContextsMapResult,
} from '@vltpkg/query'

export type HostContextsResponse = {
  local: TransferData[]
  securityArchive: HostContextsMapResult['securityArchive']
}

const seenContexts = new Map<string, HostContextsMapResult>()

/**
 * Clear the internal cache - exposed for testing
 */
export const clearCache = () => {
  seenContexts.clear()
}

/**
 * Get possible project keys for a given transfered graph.
 */
const getPossibleProjectKeys = (
  absolutePath: string,
  homeRelativePath: string,
): Set<string> => {
  const absoluteKey = `file:${absolutePath}`
  const homeRelativeKey = `file:~/${homeRelativePath}`
  const keys = [
    absoluteKey,
    homeRelativeKey,
    `${absoluteKey}/`,
    `${homeRelativeKey}/`,
  ]
  return new Set(keys)
}

const projectLoadContextFunction =
  (
    res: HostContextsResponse,
    transferData: TransferData,
    key: string,
  ) =>
  async (): Promise<HostContextsMapResult> => {
    const seenContext = seenContexts.get(key)
    if (seenContext) {
      return seenContext
    }

    // Transform server response into HostContextsMapResult format
    const initialEdges: HostContextsMapResult['initialEdges'] = []
    const initialNodes: HostContextsMapResult['initialNodes'] = []
    const securityArchive: HostContextsMapResult['securityArchive'] =
      res.securityArchive

    const { graph } = transfer.load(transferData)
    // Collect all edges and nodes
    initialEdges.push(...graph.edges)
    initialNodes.push(...graph.nodes.values())

    const result = {
      initialEdges,
      initialNodes,
      edges: [],
      nodes: [graph.mainImporter],
      securityArchive,
    }

    seenContexts.set(key, result)
    return result
  }

/**
 * Creates a Map of host context functions that can be used by the :host-context
 * pseudo selector to dynamically load graphs from different sources.
 * This is the browser-based implementation that fetches data from the server.
 * Returns a Map where keys are context names and values are functions that return HostContextsMapResult
 */
export const createHostContextsMap =
  async (): Promise<HostContextsMap> => {
    const hostContexts: HostContextsMap = new Map()

    const response = await fetch('/host-contexts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch host contexts: ${response.statusText}`,
      )
    }

    const data = (await response.json()) as HostContextsResponse

    for (const transferData of data.local) {
      const { projectInfo } = transferData

      // add multiple keys for each project folder
      for (const path of getPossibleProjectKeys(
        projectInfo.root,
        projectInfo.homedirRelativeRoot,
      )) {
        if (!hostContexts.has(path)) {
          const retrieveProjectGraph = projectLoadContextFunction(
            data,
            transferData,
            path,
          )
          hostContexts.set(path, retrieveProjectGraph)
        }
      }
    }

    // Define local context - loads graphs from all projects via server endpoint
    hostContexts.set(
      'local',
      async (): Promise<HostContextsMapResult> => {
        const seenContext = seenContexts.get('local')
        if (seenContext) {
          return seenContext
        }
        // Transform server response into HostContextsMapResult format
        const initialEdges: HostContextsMapResult['initialEdges'] = []
        const initialNodes: HostContextsMapResult['initialNodes'] = []
        const securityArchive: HostContextsMapResult['securityArchive'] =
          data.securityArchive
        const mainImporters: HostContextsMapResult['nodes'] = []

        for (const transferData of data.local) {
          const { graph } = transfer.load(transferData)
          // Collect all edges and nodes
          initialEdges.push(...graph.edges)
          initialNodes.push(...graph.nodes.values())
          mainImporters.push(graph.mainImporter)
        }

        const options = mainImporters[0]?.options ?? {}
        const virtualRoot = createVirtualRoot(
          'local',
          options,
          mainImporters,
        )

        if (!virtualRoot) {
          throw new Error(
            'Failed to create virtual root for local context',
          )
        }

        const result = {
          initialEdges,
          initialNodes,
          edges: [],
          nodes: [virtualRoot],
          securityArchive,
        }

        seenContexts.set('local', result)
        return result
      },
    )

    return hostContexts
  }
