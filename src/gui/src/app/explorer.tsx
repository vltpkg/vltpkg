import { useEffect } from 'react'
import { SearchBar } from '@/components/search-bar.jsx'
import { Logo } from '@/components/ui/logo.jsx'
import { Title } from '@/components/ui/title.jsx'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'
import { useGraphStore } from '@/state/index.js'

export type ExplorerOptions = {
  projectRoot?: string
}

export const Explorer = () => {
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
      if (!history.state || query !== history.state.query) {
        history.pushState(
          { query },
          '',
          '?query=' + encodeURIComponent(query),
        )
        window.scrollTo(0, 0)
      }
    }
    updateQueryData().catch((err: unknown) => console.error(err))
  }, [query, q])

  return (
    <>
      <div className="grid grid-cols-7 gap-4 py-2 border-b">
        <Logo className="col-span-2 p-8" />
        <div className="col-span-5 relative pt-6 pb-1">
          <Title className="mt-2 -ml-24 pr-2 absolute">Explore</Title>
          <SearchBar />
          {graph?.projectRoot ?
            <div className="text-xs text-gray-500 mt-2 absolute border border-solid border-gray-200 rounded-bl-sm rounded-br-sm z-0 py-1 px-3 top-full right-0 w-auto text-right">
              Context: {graph.projectRoot}
            </div>
          : ''}
        </div>
      </div>
      <ExplorerGrid />
    </>
  )
}
