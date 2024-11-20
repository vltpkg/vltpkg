import { create } from 'zustand'
import {
  type State,
  type Action,
  type DashboardDataProject,
} from './types.js'

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
  theme: localStorage.getItem('vite-ui-theme') as State['theme'],
  savedProjects: JSON.parse(
    localStorage.getItem('saved-projects') || '[]',
  ) as State['savedProjects'],
  lockSidebar: JSON.parse(
    localStorage.getItem('lock-sidebar') || 'false',
  ) as State['lockSidebar'],
}

/**
 * Mostly glue code from Zustand to make the store available
 * to the rest of the app. Also defines a few useful default
 * values and integrates with browser history.
 */
export const useGraphStore = create<Action & State>((set, get) => {
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
    updateTheme: (theme: State['theme']) => set(() => ({ theme })),
    reset: () => set(initialState),
    updateSavedProjects: (savedProjects: State['savedProjects']) =>
      set(() => ({ savedProjects })),
    saveProject: (item: DashboardDataProject) => {
      const savedProjects = get().savedProjects ?? []
      let updatedProjects = [...savedProjects]
      const isProjectSaved = updatedProjects.find(
        savedProject => savedProject.name === item.name,
      )

      if (!isProjectSaved) {
        updatedProjects.push(item)
      } else {
        updatedProjects = updatedProjects.filter(
          savedProject => savedProject.name !== item.name,
        )
      }

      set({ savedProjects: updatedProjects })
      localStorage.setItem(
        'saved-projects',
        JSON.stringify(updatedProjects),
      )
    },
    updateLockSidebar: (locked: State['lockSidebar']) => {
      set({ lockSidebar: locked })
      localStorage.setItem('lock-sidebar', JSON.stringify(locked))
    },
  }

  // updates internal state anytime the browser URL changes
  window.addEventListener('popstate', (e: PopStateEvent): void => {
    if (!e.state) return
    const { query, route } = e.state as {
      query?: string
      route?: string
    }
    if (query != null) {
      store.updateQuery(query)
    }
    if (route) {
      store.updateActiveRoute(route)
    }
  })
  return store
})
