import { useNavigate } from 'react-router'
import { useEffect, useRef } from 'react'
import { Query } from '@vltpkg/query'
import { QueryBar } from '@/components/query-bar/index.tsx'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { load } from '@/state/load-graph.ts'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.tsx'
import Save from '@/components/explorer-grid/save-query.tsx'
import { QueryMatches } from '@/components/explorer-grid/query-matches.tsx'
import { RootButton } from '@/components/explorer-grid/root-button.tsx'
import { SetupProject } from '@/components/explorer-grid/setup-project.tsx'
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

  return (
    <section className="relative flex h-full max-h-[calc(100svh-65px-16px)] w-full grow flex-col overflow-y-auto rounded-b-lg border-x-[1px] border-b-[1px]">
      <section className="sticky top-0 z-[20] flex w-full items-center bg-background px-8 pt-1">
        <div className="relative flex w-full max-w-8xl flex-row items-center gap-2">
          <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-6 bg-gradient-to-b from-background" />
          <RootButton />
          <QueryBar
            tabIndex={0}
            startContent={
              <Search size={20} className="ml-3 text-neutral-500" />
            }
            endContent={
              <div className="relative mr-3 hidden items-center gap-1 md:flex">
                <QueryMatches />
                <Save />
                <Kbd className='before:content-[" "] relative ml-3 before:absolute before:-ml-10 before:h-[0.75rem] before:w-[1.25px] before:rounded-sm before:bg-neutral-600'>
                  <Command size={12} />
                </Kbd>
                <Kbd className="text-sm">k</Kbd>
                <div className="absolute inset-0 -bottom-2 -right-3 -top-2 z-[-2] rounded-br-md rounded-tr-md border-y border-r border-input bg-gradient-to-r from-white/20 via-white/50 to-white backdrop-blur-sm dark:from-neutral-900/20 dark:via-neutral-900/50 dark:to-neutral-900" />
              </div>
            }
          />
        </div>{' '}
      </section>
      <div className="z-[10] pt-4">
        <ExplorerGrid />
      </div>
    </section>
  )
}
