import { transfer } from '@vltpkg/graph/browser'
import { useNavigate } from 'react-router'
import { useEffect, useRef } from 'react'
import { Query } from '@vltpkg/query'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'
import { useQueryNavigation } from '@/components/hooks/use-query-navigation.tsx'
import { createHostContextsMap } from '@/lib/query-host-contexts.ts'
import { hasLocalServerFeatures } from '@/lib/environment.ts'
import type { TransferData, Action, State } from '@/state/types.ts'

export type ExplorerOptions = {
  projectRoot?: string
}

type StartGraphData = {
  updateHasDashboard: Action['updateHasDashboard']
  updateGraph: Action['updateGraph']
  updateProjectInfo: Action['updateProjectInfo']
  updateQ: Action['updateQ']
  updateSpecOptions: Action['updateSpecOptions']
  stamp: State['stamp']
}

const startGraphData = async ({
  updateHasDashboard,
  updateGraph,
  updateProjectInfo,
  updateQ,
  updateSpecOptions,
  stamp,
}: StartGraphData) => {
  const res = await fetch('/graph.json?random=' + stamp)
  const data = (await res.json()) as TransferData & {
    hasDashboard: boolean
  }

  const { graph, specOptions, securityArchive } = transfer.load(data)
  const hostContexts = await createHostContextsMap()
  const nodes = new Set(graph.nodes.values())
  const edges = graph.edges
  const importers = graph.importers
  const q = new Query({
    edges,
    nodes,
    importers,
    securityArchive,
    hostContexts,
  })

  updateHasDashboard(data.hasDashboard)
  updateGraph(graph)
  updateProjectInfo(data.projectInfo)
  updateSpecOptions(specOptions)
  updateQ(q)
}

export const Explorer = () => {
  const navigate = useNavigate()
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateHasDashboard = useGraphStore(
    state => state.updateHasDashboard,
  )
  const updateGraph = useGraphStore(state => state.updateGraph)
  const updateProjectInfo = useGraphStore(
    state => state.updateProjectInfo,
  )
  const updateQ = useGraphStore(state => state.updateQ)
  const updateSpecOptions = useGraphStore(
    state => state.updateSpecOptions,
  )
  const stamp = useGraphStore(state => state.stamp)
  const isHostedMode = !hasLocalServerFeatures()

  useQueryNavigation()

  // only load graph data when we want to manually update the graph
  // state in the app, to make sure we're controlling it, we use the
  // stamp state as a dependency of `useEffect` to trigger the load.
  useEffect(() => {
    // Skip in hosted environments
    if (isHostedMode) {
      console.info(
        'Graph data fetching disabled in hosted environment',
      )
      return
    }

    startGraphData({
      updateHasDashboard,
      updateGraph,
      updateProjectInfo,
      updateQ,
      updateSpecOptions,
      stamp,
    }).catch((err: unknown) => {
      console.error(err)
      void navigate('/error')
      updateErrorCause('Failed to initialize explorer.')
    })
  }, [
    stamp,
    updateHasDashboard,
    updateGraph,
    updateProjectInfo,
    updateQ,
    updateSpecOptions,
    navigate,
    updateErrorCause,
    isHostedMode,
  ])

  // Show hosted mode message for explorer
  if (isHostedMode) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-4">
        <div className="max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold">
            Hosted Demo Mode
          </h1>
          <p className="mb-4 text-muted-foreground">
            This is a static hosted version of the VLT GUI. The
            explorer requires a local VLT server to display project
            graphs.
          </p>
          <p className="text-sm text-muted-foreground">
            To use the full explorer features, please run the GUI
            locally with{' '}
            <code className="rounded bg-muted px-2 py-1">
              vlt gui
            </code>
            .
          </p>
        </div>
      </div>
    )
  }

  return <ExplorerContent />
}

const ExplorerContent = () => {
  const updateEdges = useGraphStore(state => state.updateEdges)
  const updateNodes = useGraphStore(state => state.updateNodes)
  const graph = useGraphStore(state => state.graph)
  const projectInfo = useGraphStore(state => state.projectInfo)
  const query = useGraphStore(state => state.query)
  const q = useGraphStore(state => state.q)
  const ac = useRef<AbortController>(new AbortController())

  // updates the query response state anytime the query changes
  // by defining query and q as dependencies of `useEffect` we
  // make sure that this only runs when the query changes
  useEffect(() => {
    async function updateQueryData() {
      if (!q) return

      ac.current.abort(new Error('Query changed'))
      ac.current = new AbortController()
      const queryResponse = await q.search(query, {
        signal: ac.current.signal,
        scopeIDs: graph ? [graph.mainImporter.id] : undefined,
      })

      updateEdges(queryResponse.edges)
      updateNodes(queryResponse.nodes)
    }

    void updateQueryData().catch(() => {
      updateEdges([])
      updateNodes([])
    })
  }, [query, q, graph, updateEdges, updateNodes])

  // avoids flash of content
  if (!graph) {
    return undefined
  }

  // intentional check for `false` in order to avoid flashing content
  if (projectInfo.vltInstalled === false) {
    return <SetupProject />
  }

  return <ExplorerGrid />
}
