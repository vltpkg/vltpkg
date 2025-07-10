import { useNavigate } from 'react-router'
import { useEffect, useRef } from 'react'
import { Query } from '@vltpkg/query'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { load } from '@/state/load-graph.ts'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'
import { useQueryNavigation } from '@/components/hooks/use-query-navigation.tsx'
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

  const { graph, specOptions, securityArchive } = load(data)
  const q = new Query({ graph, specOptions, securityArchive })

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

  useQueryNavigation()

  // only load graph data when we want to manually update the graph
  // state in the app, to make sure we're controlling it, we use the
  // stamp state as a dependency of `useEffect` to trigger the load.
  useEffect(() => {
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
  ])

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
