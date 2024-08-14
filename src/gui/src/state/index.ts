import { create } from 'zustand'
import { State, Action } from './types.js'

const initialState: State = {
  graph: undefined,
  edges: [],
  nodes: [],
  query:
    new URL(
      window.location.href || 'http://localhost',
    ).searchParams.get('query') ?? ':project > *',
  q: undefined,
  selectedNode: undefined,
  specOptions: undefined,
  stamp: String(Math.random()).slice(2),
}

/**
 * Mostly glue code from Zustand to make the store available
 * to the rest of the app. Also defines a few useful default
 * values and integrates with browser history.
 */
export const useGraphStore = create<State & Action>(set => {
  const store = {
    ...initialState,
    updateGraph: (graph: State['graph']) => set(() => ({ graph })),
    updateQ: (q: State['q']) => set(() => ({ q })),
    updateQuery: (query: State['query']) => set(() => ({ query })),
    updateEdges: (edges: State['edges']) => set(() => ({ edges })),
    updateNodes: (nodes: State['nodes']) => set(() => ({ nodes })),
    updateSelectedNode: (selectedNode: State['selectedNode']) =>
      set(() => ({ selectedNode })),
    updateSpecOptions: (specOptions: State['specOptions']) =>
      set(() => ({ specOptions })),
    updateStamp: (stamp: string) => set(() => ({ stamp })),
    reset: () => set(initialState),
  }
  // updates internal state anytime the browser URL changes
  window.addEventListener('popstate', (e: PopStateEvent) => {
    const query = e.state.query
    if (query) {
      store.updateQuery(query)
    }
  })
  return store
})
