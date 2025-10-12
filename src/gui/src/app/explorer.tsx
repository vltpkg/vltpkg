import { transfer } from '@vltpkg/graph/browser'
import { useNavigate, useParams, useLocation } from 'react-router'
import { useEffect, useRef } from 'react'
import { Query } from '@vltpkg/query'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'
import { useQueryNavigation } from '@/components/hooks/use-query-navigation.tsx'
import { createHostContextsMap } from '@/lib/query-host-contexts.ts'
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
  const location = useLocation()
  const params = useParams<{ package?: string; version?: string }>()
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
  const updateIsExternalPackage = useGraphStore(
    state => state.updateIsExternalPackage,
  )
  const updateExternalPackageSpec = useGraphStore(
    state => state.updateExternalPackageSpec,
  )
  const updateFocused = useGraphStore(state => state.updateFocused)

  // Detect if we're on the npm package route
  const isNpmRoute = location.pathname.startsWith('/explore/npm/')
  const npmPackageName = params.package
  const npmPackageVersion = params.version

  useQueryNavigation()

  // Check if we're viewing an external npm package
  useEffect(() => {
    updateIsExternalPackage(isNpmRoute)
    if (isNpmRoute && npmPackageName) {
      // Store package name and optional version
      const spec =
        npmPackageVersion ?
          `${npmPackageName}@${npmPackageVersion}`
        : npmPackageName
      updateExternalPackageSpec(spec)
      // Automatically enable focused mode for external packages
      updateFocused(true)
    } else {
      updateExternalPackageSpec(null)
    }
  }, [
    isNpmRoute,
    npmPackageName,
    npmPackageVersion,
    updateIsExternalPackage,
    updateExternalPackageSpec,
    updateFocused,
  ])

  // only load graph data when we want to manually update the graph
  // state in the app, to make sure we're controlling it, we use the
  // stamp state as a dependency of `useEffect` to trigger the load.
  // Skip loading graph data for external packages
  useEffect(() => {
    if (isNpmRoute) {
      // For external npm packages, we don't need to load graph data
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
    isNpmRoute,
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
  const isExternalPackage = useGraphStore(
    state => state.isExternalPackage,
  )
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

  // For external packages, skip all checks and go straight to ExplorerGrid
  if (isExternalPackage) {
    return <ExplorerGrid />
  }

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
