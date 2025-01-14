import { useEffect } from 'react'
import { Query } from '@vltpkg/query'
import { SearchBar } from '@/components/search-bar.jsx'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'
import {
  type TransferData,
  type Action,
  type State,
} from '@/state/types.js'
import { load } from '@/state/load-graph.js'
import { Search, Command } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd.jsx'

export type ExplorerOptions = {
  projectRoot?: string
}

type StartGraphData = {
  updateHasDashboard: Action['updateHasDashboard']
  updateGraph: Action['updateGraph']
  updateQ: Action['updateQ']
  updateSpecOptions: Action['updateSpecOptions']
  stamp: State['stamp']
}

const startGraphData = async ({
  updateHasDashboard,
  updateGraph,
  updateQ,
  updateSpecOptions,
  stamp,
}: StartGraphData) => {
  const res = await fetch('./graph.json?random=' + stamp)
  const data = (await res.json()) as TransferData & {
    hasDashboard: boolean
  }
  const { graph, specOptions } = load(data)
  const q = new Query({ graph })

  updateHasDashboard(data.hasDashboard)
  updateGraph(graph)
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
  const query = useGraphStore(state => state.query)
  const q = useGraphStore(state => state.q)

  // updates the query response state anytime the query changes
  // by defining query and q as dependencies of `useEffect` we
  // make sure that this only runs when the query changes
  useEffect(() => {
    async function updateQueryData() {
      if (!q) return
      const queryResponse = await q.search(query)

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
    updateQueryData().catch((err: unknown) => console.error(err))
  }, [query, q])

  return (
    <section className="flex grow flex-col justify-between">
      <div className="flex items-center justify-between w-full px-8 pt-4 border-t-[1px]">
        {graph?.projectRoot ?
          <p className="text-xs font-mono font-light text-muted-foreground">
            :host-context(file:{graph.projectRoot})
          </p>
        : ''}
        {dashboard?.buildVersion ?
          <p className="text-xs font-mono font-light text-muted-foreground text-right">
            build: v{dashboard.buildVersion}
          </p>
        : ''}
      </div>
      <section className="flex items-center px-8 py-4 border-b-[1px] border-solid">
        <div className="flex flex-col gap-2 w-full">
          <SearchBar
            tabIndex={0}
            className="w-full bg-muted-foreground/5"
            startContent={
              <Search size={20} className="ml-3" color="#a3a3a3" />
            }
            endContent={
              <div className="hidden md:flex gap-1 mr-3 backdrop-blur-sm">
                <Kbd>
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
