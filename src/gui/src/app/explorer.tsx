import { motion, AnimatePresence } from 'framer-motion'
import { transfer } from '@vltpkg/graph/browser'
import { useNavigate, useParams, useLocation } from 'react-router'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  startTransition,
} from 'react'
import { Query } from '@vltpkg/query'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'
import { useQueryNavigation } from '@/components/hooks/use-query-navigation.tsx'
import { createHostContextsMap } from '@/lib/query-host-contexts.ts'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'
import type { TransferData, Action } from '@/state/types.ts'

export type ExplorerOptions = {
  projectRoot?: string
}

type StartGraphData = {
  updateHasDashboard: Action['updateHasDashboard']
  updateGraph: Action['updateGraph']
  updateProjectInfo: Action['updateProjectInfo']
  updateQ: Action['updateQ']
  updateSpecOptions: Action['updateSpecOptions']
}

const startGraphData = async ({
  updateHasDashboard,
  updateGraph,
  updateProjectInfo,
  updateQ,
  updateSpecOptions,
}: StartGraphData) => {
  const res = await fetch(
    '/graph.json?random=' + String(Math.random()),
  )
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

  // Batch all state updates together using startTransition
  // This reduces multiple renders to a single render
  startTransition(() => {
    updateHasDashboard(data.hasDashboard)
    updateGraph(graph)
    updateProjectInfo(data.projectInfo)
    updateSpecOptions(specOptions)
    updateQ(q)
  })
}

// 'supercharge' the `explorer-grid` component
// so that can get access to some fancy animations
const ExplorerGridWrapper = forwardRef<
  HTMLDivElement,
  ComponentProps<'div'> & {
    isLoading?: boolean
    loadedQuery?: string
  }
>(({ isLoading, loadedQuery, ...props }, ref) => {
  return (
    <div ref={ref} {...props}>
      <ExplorerGrid isLoading={isLoading} loadedQuery={loadedQuery} />
    </div>
  )
})
ExplorerGridWrapper.displayName = 'ExplorerGridWrapper'

const MotionExplorerGrid = motion.create(ExplorerGridWrapper)

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
  const updateEdges = useGraphStore(state => state.updateEdges)
  const updateNodes = useGraphStore(state => state.updateNodes)
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
    // Batch state updates together to prevent multiple renders
    if (isNpmRoute && npmPackageName) {
      startTransition(() => {
        updateIsExternalPackage(true)
        // Store package name and optional version
        const spec =
          npmPackageVersion ?
            `${npmPackageName}@${npmPackageVersion}`
          : npmPackageName
        updateExternalPackageSpec(spec)
        // Automatically enable focused mode for external packages
        updateFocused(true)
      })
    } else {
      startTransition(() => {
        updateIsExternalPackage(false)
        updateExternalPackageSpec(null)
      })
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

    // Clear stale graph data immediately when stamp changes (project switch)
    // This prevents showing old project data while new data loads
    updateGraph(undefined)
    updateQ(undefined)
    updateEdges([])
    updateNodes([])

    startGraphData({
      updateHasDashboard,
      updateGraph,
      updateProjectInfo,
      updateQ,
      updateSpecOptions,
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
    updateEdges,
    updateNodes,
    navigate,
    updateErrorCause,
  ])

  return <ExplorerContent />
}

const explorerMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
  },
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
  const [isLoading, setIsLoading] = useState(false)
  const [loadedQuery, setLoadedQuery] = useState<string | undefined>(
    undefined,
  )

  // updates the query response state anytime the query changes
  // by defining query and q as dependencies of `useEffect` we
  // make sure that this only runs when the query changes
  useEffect(() => {
    async function updateQueryData() {
      if (!q) return

      // Set loading state immediately when query changes
      setIsLoading(true)

      ac.current.abort(new Error('Query changed'))
      ac.current = new AbortController()
      const queryResponse = await q.search(query, {
        signal: ac.current.signal,
        scopeIDs:
          graph?.mainImporter ? [graph.mainImporter.id] : undefined,
      })

      // Batch all result updates together using startTransition
      // This reduces multiple renders to a single render
      startTransition(() => {
        updateEdges(queryResponse.edges)
        updateNodes(queryResponse.nodes)
        setIsLoading(false)
        setLoadedQuery(query)
      })
    }

    void updateQueryData().catch((err: unknown) => {
      // Ignore errors from cancelled queries
      if (
        err instanceof Error &&
        (err.message === 'Query changed' || err.name === 'AbortError')
      ) {
        return
      }
      console.error(err)
      // Batch error state updates
      startTransition(() => {
        updateEdges([])
        updateNodes([])
        setIsLoading(false)
      })
    })
  }, [query, q, graph, updateEdges, updateNodes])

  // For external packages, skip all checks and go straight to ExplorerGrid
  if (isExternalPackage) {
    return <ExplorerGrid />
  }

  // intentional check for `false` in order to avoid flashing content
  if (projectInfo.vltInstalled === false) {
    return <SetupProject />
  }

  return (
    <AnimatePresence mode="popLayout">
      {!graph ?
        <motion.div
          key="loading"
          className="absolute inset-0 z-100 flex h-full w-full justify-center"
          {...explorerMotion}>
          <div className="relative flex h-full w-full items-center justify-center">
            <JellyTriangleSpinner className="text-primary" />
          </div>
        </motion.div>
      : <MotionExplorerGrid
          key="grid"
          {...explorerMotion}
          isLoading={isLoading}
          loadedQuery={loadedQuery}
          className="h-full"
          transition={{
            delay: 0.25, // to ensure it has enough time
          }}
        />
      }
    </AnimatePresence>
  )
}
