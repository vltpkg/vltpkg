import { create } from 'zustand'
import { State, Action } from './types.js'

export const DEFAULT_QUERY = ':project > *'

const initialState: State = {
  activeRoute: location.pathname,
  dashboard: undefined,
  graph: undefined,
  edges: [],
  errorCause: '',
  hasDashboard: false,
  nodes: [],
  query:
    new URL(
      window.location.href || 'http://localhost',
    ).searchParams.get('query') ?? DEFAULT_QUERY,
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
    updateActiveRoute: (activeRoute: State['activeRoute']) =>
      set(() => ({
        activeRoute,
        stamp: String(Math.random()).slice(2),
      })),
    updateDashboard: (dashboard: State['dashboard']) =>
      set(() => ({ dashboard })),
    updateGraph: (graph: State['graph']) => set(() => ({ graph })),
    updateQ: (q: State['q']) => set(() => ({ q })),
    updateQuery: (query: State['query']) => set(() => ({ query })),
    updateEdges: (edges: State['edges']) => set(() => ({ edges })),
    updateErrorCause: (errorCause: State['errorCause']) =>
      set(() => ({ errorCause })),
    updateHasDashboard: (hasDashboard: State['hasDashboard']) =>
      set(() => ({ hasDashboard })),
    updateNodes: (nodes: State['nodes']) => set(() => ({ nodes })),
    updateSelectedNode: (selectedNode: State['selectedNode']) =>
      set(() => ({ selectedNode })),
    updateSpecOptions: (specOptions: State['specOptions']) =>
      set(() => ({ specOptions })),
    updateStamp: (stamp: string) => set(() => ({ stamp })),
    reset: () => set(initialState),
  }

  // updates internal state anytime the browser URL changes
  window.addEventListener('popstate', (e: PopStateEvent): void => {
    if (!e.state) return
    const { query, route } = e.state
    if (query != null) {
      store.updateQuery(query)
    }
    if (route) {
      store.updateActiveRoute(route)
    }
  })
  return store
})
