import { load } from '@/state/load-graph.ts'
import { asSecurityArchiveLike } from '@vltpkg/security-archive/browser'
import { createVirtualRoot } from '@vltpkg/graph/browser'
import type { TransferData } from '@/state/types.ts'
import type {
  HostContextsMap,
  HostContextsMapResult,
} from '@vltpkg/query'

const seenContexts = new Map<string, HostContextsMapResult>()

/**
 * Creates a Map of host context functions that can be used by the :host-context
 * pseudo selector to dynamically load graphs from different sources.
 * This is the browser-based implementation that fetches data from the server.
 * Returns a Map where keys are context names and values are functions that return HostContextsMapResult
 */
export const createHostContextsMap = (): HostContextsMap => {
  const hostContexts: HostContextsMap = new Map()

  // Define local context - loads graphs from all projects via server endpoint
  hostContexts.set(
    'local',
    async (): Promise<HostContextsMapResult> => {
      const seenContext = seenContexts.get('local')
      if (seenContext) {
        return seenContext
      }
      try {
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

        const data = (await response.json()) as {
          local: TransferData[]
          securityArchive: HostContextsMapResult['securityArchive']
        }

        // Transform server response into HostContextsMapResult format
        const initialEdges: HostContextsMapResult['initialEdges'] = []
        const initialNodes: HostContextsMapResult['initialNodes'] = []
        const securityArchive: HostContextsMapResult['securityArchive'] =
          data.securityArchive
        const mainImporters: HostContextsMapResult['nodes'] = []

        for (const transferData of data.local) {
          const { graph } = load(transferData)
          // Collect all edges and nodes
          initialEdges.push(...graph.edges)
          initialNodes.push(...graph.nodes.values())
          mainImporters.push(graph.mainImporter)
        }

        const options = mainImporters[0]?.options
        const virtualRoot = createVirtualRoot(
          'local',
          options ?? {},
          mainImporters,
        )

        if (!virtualRoot) {
          throw new Error(
            'Failed to create virtual root for local context',
          )
        }

        return {
          initialEdges,
          initialNodes,
          edges: [],
          nodes: [virtualRoot],
          securityArchive,
        }
      } catch (error) {
        console.error('Failed to load host contexts:', error)
        // Return empty result on error
        const res = {
          initialEdges: [],
          initialNodes: [],
          edges: [],
          nodes: [],
          securityArchive: asSecurityArchiveLike(new Map()),
        }
        seenContexts.set('local', res)
        return res
      }
    },
  )

  return hostContexts
}
