import { create } from 'zustand'
import type { SavedQuery } from '@/state/types.ts'

export type QueriesState = {
  isCreating: boolean
  deleteDialogOpen: boolean
  filteredQueries: SavedQuery[]
  selectedQueries: SavedQuery[]
}

export type QueriesAction = {
  setIsCreating: (isCreating: QueriesState['isCreating']) => void
  setDeleteDialogOpen: (
    deleteDialogOpen: QueriesState['deleteDialogOpen'],
  ) => void
  setFilteredQueries: (
    filteredQueries: QueriesState['filteredQueries'],
  ) => void
  setSelectedQueries: (
    selectedQueries: QueriesState['selectedQueries'],
  ) => void
}

const initialState: QueriesState = {
  isCreating: false,
  deleteDialogOpen: false,
  filteredQueries: [],
  selectedQueries: [],
}

export const useQueriesStore = create<QueriesState & QueriesAction>(
  set => {
    const store = {
      ...initialState,
      setIsCreating: (isCreating: QueriesState['isCreating']) =>
        set(() => ({ isCreating })),
      setFilteredQueries: (
        filteredQueries: QueriesState['filteredQueries'],
      ) => set(() => ({ filteredQueries })),
      setDeleteDialogOpen: (
        deleteDialogOpen: QueriesState['deleteDialogOpen'],
      ) => set(() => ({ deleteDialogOpen })),
      setSelectedQueries: (
        selectedQueries: QueriesState['selectedQueries'],
      ) => set(() => ({ selectedQueries })),
    }

    return store
  },
)
