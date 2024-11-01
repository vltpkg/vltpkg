import { useEffect, MouseEvent } from 'react'
import { Query } from '@vltpkg/query'
import { SearchBar } from '@/components/search-bar.jsx'
import { Logo } from '@/components/ui/logo.jsx'
import { Title } from '@/components/ui/title.jsx'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'
import { Action, State } from '@/state/types.js'
import { load } from '@/state/load-graph.js'
import { ModeToggle } from '@/components/ui/mode-toggle.jsx'
import { Button } from '@/components/ui/button.jsx'
import { LayoutDashboard } from 'lucide-react'

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
  const data = await res.json()
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
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateEdges = useGraphStore(state => state.updateEdges)
  const updateNodes = useGraphStore(state => state.updateNodes)
  const hasDashboard = useGraphStore(state => state.hasDashboard)
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
      if (
        !history.state ||
        query !== history.state.query ||
        history.state.route !== '/explore'
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

  const onDashboardButtonClick = (e: MouseEvent) => {
    e.preventDefault()
    updateActiveRoute('/dashboard')
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-4 py-2 border-b">
        <Logo className="col-span-2 p-8" />
        <div className="col-span-5 relative pt-6 pb-1">
          <Title className="mt-2 -ml-24 pr-2 absolute">Explore</Title>
          <div className="flex">
            <SearchBar />
            <ModeToggle />
            {hasDashboard ?
              <Button
                className="ml-2"
                variant="outline"
                onClick={onDashboardButtonClick}>
                <LayoutDashboard size={12} /> Back to Dashboard
              </Button>
            : ''}
          </div>
          {graph?.projectRoot ?
            <div className="text-xs text-gray-500 mt-2 absolute border border-solid rounded-bl-sm rounded-br-sm z-0 py-1 px-3 top-full right-0 w-auto text-right">
              Context: {graph.projectRoot}
            </div>
          : ''}
        </div>
      </div>
      <ExplorerGrid />
    </>
  )
}
