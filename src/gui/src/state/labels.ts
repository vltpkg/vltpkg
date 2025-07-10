import { create } from 'zustand'
import type { QueryLabel } from '@/state/types.ts'

export type LabelsState = {
  isCreating: boolean
  deleteDialogOpen: boolean
  selectedLabels: QueryLabel[]
  filteredLabels: QueryLabel[]
}

export type LabelsAction = {
  setIsCreating: (isCreating: LabelsState['isCreating']) => void
  setDeleteDialogOpen: (
    deleteDialogOpen: LabelsState['deleteDialogOpen'],
  ) => void
  setSelectedLabels: (
    selectedLabels: LabelsState['selectedLabels'],
  ) => void
  setFilteredLabels: (
    filteredLabels: LabelsState['filteredLabels'],
  ) => void
}

const initialState: LabelsState = {
  isCreating: false,
  deleteDialogOpen: false,
  selectedLabels: [],
  filteredLabels: [],
}

export const useLabelsStore = create<LabelsState & LabelsAction>(
  set => {
    const store = {
      ...initialState,
      setDeleteDialogOpen: (
        deleteDialogOpen: LabelsState['deleteDialogOpen'],
      ) => set(() => ({ deleteDialogOpen })),
      setSelectedLabels: (
        selectedLabels: LabelsState['selectedLabels'],
      ) => set(() => ({ selectedLabels })),
      setIsCreating: (isCreating: LabelsState['isCreating']) =>
        set(() => ({ isCreating })),
      setFilteredLabels: (
        filteredLabels: LabelsState['filteredLabels'],
      ) => set(() => ({ filteredLabels })),
    }

    return store
  },
)
