import { useEffect, StrictMode } from 'react'
import { Query } from '@vltpkg/query'
import { createRoot } from 'react-dom/client'
import { Explorer } from './app/explorer.js'
import { useGraphStore } from './state/index.js'
import { load } from './state/load-graph.js'
import { Action, State } from './state/types.js'
import { ThemeProvider } from '@/components/ui/theme-provider.jsx'

type StartGraphData = {
  updateGraph: Action['updateGraph']
  updateQ: Action['updateQ']
  updateSpecOptions: Action['updateSpecOptions']
  stamp: State['stamp']
}

const startGraphData = async ({
  updateGraph,
  updateQ,
  updateSpecOptions,
  stamp,
}: StartGraphData) => {
  const res = await fetch('./graph.json?random=' + stamp)
  const data = await res.json()
  const { graph, specOptions } = load(data)
  const q = new Query({ graph })

  updateGraph(graph)
  updateSpecOptions(specOptions)
  updateQ(q)
}

const App = () => {
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
      updateGraph,
      updateQ,
      updateSpecOptions,
      stamp,
    }).catch((err: unknown) => console.error(err))
  }, [stamp])

  return (
    <div className="container mx-auto">
      <Explorer />
    </div>
  )
}

const rootElement = document.getElementById('app')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}
