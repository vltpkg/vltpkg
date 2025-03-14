import { useEffect, useRef } from 'react'
import { Query } from '@vltpkg/query'
import { SearchBar } from '@/components/search-bar.jsx'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'
import type { TransferData, Action, State } from '@/state/types.js'
import { load } from '@/state/load-graph.js'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.jsx'
import Save from '@/components/explorer-grid/save-query.jsx'
import { QueryMatches } from '@/components/explorer-grid/query-matches.jsx'
import { RootButton } from '@/components/explorer-grid/root-button.jsx'
import { SetupProject } from '@/components/explorer-grid/setup-project.jsx'

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
  const res = await fetch('./graph.json?random=' + stamp)
  const data = (await res.json()) as TransferData & {
    hasDashboard: boolean
  }
  const { graph, specOptions } = load(data)
  const q = new Query({ graph, specOptions })

  updateHasDashboard(data.hasDashboard)
  updateGraph(graph)
  updateProjectInfo(data.projectInfo)
  updateSpecOptions(specOptions)
  updateQ(q)
}

export const Explorer = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
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
      updateActiveRoute('/error')
      updateErrorCause('Failed to initialize explorer.')
    })
  }, [stamp])

  return <ExplorerContent />
}

const ExplorerContent = () => {
  const dashboard = useGraphStore(state => state.dashboard)
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
      const queryResponse = await q.search(query, ac.current.signal)

      updateEdges(queryResponse.edges)
      updateNodes(queryResponse.nodes)

      // make sure we update the URL with the query string
      const state = history.state as
        | undefined
        | { query: string; route: string }
      if (
        !state ||
        query !== state.query ||
        state.route !== '/explore'
      ) {
        history.pushState(
          { query, route: '/explore' },
          '',
          '/explore?query=' + encodeURIComponent(query),
        )
        window.scrollTo(0, 0)
      }
    }
    void updateQueryData().catch(() => {})
  }, [query, q])

  // avoids flash of content
  if (!graph) {
    return undefined
  }

  // intentional check for `false` in order to avoid flashing content
  if (projectInfo.vltInstalled === false) {
    return <SetupProject />
  }

  return (
    <section className="flex h-full max-h-[calc(100svh-65px-16px)] w-full grow flex-col justify-between overflow-y-auto rounded-b-lg border-[1px]">
      <div className="flex h-[50px] w-full border-b-[1px] px-8 py-4">
        <div className="flex w-full max-w-8xl items-center justify-between">
          {graph.projectRoot ?
            <p className="font-mono text-xs font-light text-muted-foreground">
              :host-context(file:{graph.projectRoot})
            </p>
          : ''}
          {dashboard?.buildVersion ?
            <p className="text-right font-mono text-xs font-light text-muted-foreground">
              build: v{dashboard.buildVersion}
            </p>
          : ''}
        </div>
      </div>
      <section className="flex w-full items-center px-8 py-4">
        <div className="flex w-full max-w-8xl flex-row items-center gap-2">
          <RootButton />
          <SearchBar
            tabIndex={0}
            className="relative w-full bg-white dark:bg-muted-foreground/5"
            startContent={
              <Search size={20} className="ml-3 text-neutral-500" />
            }
            endContent={
              <div className="mr-3 hidden items-center gap-1 backdrop-blur-sm md:flex">
                <QueryMatches />
                <Save />
                <Kbd className='before:content-[" "] relative ml-3 before:absolute before:-ml-10 before:h-[0.75rem] before:w-[1.25px] before:rounded-sm before:bg-neutral-600'>
                  <Command size={12} />
                </Kbd>
                <Kbd className="text-sm">k</Kbd>
              </div>
            }
          />
        </div>
      </section>
      <ExplorerGrid />
    </section>
  )
}
